# Roomba-Roamer
Control a Roomba over the Web!

---

<a href="https://famine.potato.irish/pong" target="_blank">
  <img src="https://raw.githubusercontent.com/Itimoto/Potato.Irish-Server/master/public/images/jpg/rr-display.jpg" 
  alt="The Roomba in its unnatural habitat" />
</a>

> Currently running over on [potato.irish](https://famine.potato.irish/rr)

---

## How To *Roam* (If you're here for the Fun)
The premise is simple: By the end, here, you'll have moved a little robot in my room. So, bear with me:
There is a Queue to control the Roomba -- your spot in line is indicated by the text in the Top-Right Corner:
   1) `You're Up!` -- You're Up. Your keyboard/screen's connected to the Roomba, giving you the reins for a *solid 30 seconds*
   2) `Position: 2` -- You're at bat. You've got access to the live feed, but *not* to Control.
   3) `Position: 3` -- Ditto.
   4) `Position: 4` -- Here, to save some resources, you can't access the live feed. Instead, you're linked up to another person In Line for a game of *Pong*. Instructions below.
   5) `Position: etc` -- You've reached the bottom.
   
## Roomba Controls:
You're in one of two boats: Desktop, or Mobile. For both, you'll need to get accustomed to the *light* latency. About ~300-500ms worth. Still...
### For Desktop:
Use the keyboard. Here:
>   - ***W***: *Gas, Gas, Gas -- Moves you forward*
>   - ***S***: *Reverse Gas, Reverse Gas, You Get the Gist -- Reverse*
>   - ***A***: *Rotate left*
>   - ***D***: *Rotate Right* 
>   - ***X***: *Failsafe. When I screw up, hit this button: you'll know that I've screwed up if you start spinning for no reason... or something.*
   
### For Mobile:
You'll have a Joystick on your right. It should also be fairly straightforward, *but* be fair-warned that it's not quite like driving a car: Move the Joystick Forward/Backward to *move* Forward/Backward, and move it Left/Right to *move* Left/Right. **Not** to 'turn the wheels' Left/Right. There are only two wheels, dammit.
>To my dear left-handed friend *Lucien*, I dedicate a... I'm sorry, Lucien.

---

## How to Implement the Roomba Roamer (If you're here for the *real* Fun)
First, you'll need your prerequisites:
- *General*
    - Node.js, NPM, and Git need to be installed locally
    - A distinct lack of fear of a Command Line
- *Roomba-Wise*
    - Roomba ([500 Series](https://store.irobot.com/default/parts-and-accessories/roomba-accessories/professional-and-500-series/) or Above)
    - [Raspberry Pi](https://www.raspberrypi.org/) (Current Implentation is running Raspbian on a Pi Model 2B)
        - Something to Power your Pi (e.g. Battery, Extension Cord + Power Brick, Bluetooth Speaker...)
        - A [Pi Camera Module](https://www.raspberrypi.org/products/camera-module-v2/)
    - Some Basic Electronics
        - A few Male-Male [jumper wires](https://www.amazon.com/Breadboard-Jumper-Wire-75pcs-pack/dp/B0040DEI9M)
        - A [Breadboard](https://www.amazon.com/EL-CP-003-Breadboard-Solderless-Distribution-Connecting/dp/B01EV6LJ7G/ref=sr_1_5?dchild=1&keywords=breadboard&qid=1595453103&sr=8-5)
        - A 10k Resistor and a 22k [Resistor](https://www.amazon.com/Resistor-Assorted-Resistors-Assortment-Experiments/dp/B07L851T3V/ref=sr_1_3?dchild=1&keywords=resistor+pack&qid=1595453238&sr=8-3)
    - A similar lack of fear of Screwing Up

If you'd like to deploy it to a Server/VPS, you'll have a little more to do. I've written up a [Fairly-Brief guide](https://github.com/Itimoto/Potato.Irish-Server#hol-up-what-if-you-screwed-up-along-the-way-and-needed-to-reset-potatoirish-from-scratch) on the full [Potato.Irish Server Repository](https://github.com/Itimoto/Potato.Irish-Server); that ought to get you started.

> *"Two roads diverged in a yellow wood."* ~ *The Road Not Taken*, by Robert Frost

<details>
<summary>

You can implement with HTTP or HTTPS, but you'll need SSL Certificates for the latter. The methods for implementation are slightly different.
</summary>

You will need SSL Certificates for an HTTPS app. I used [Certbot](https://certbot.eff.org/)

I built the Roamer as an HTTP app, originally; however, I migrated it to HTTPS/SPDY for better load times and better SEO. At the same time, implementing HTTP is *quite* a bit simpler than HTTPS. But there is *still* a difference.

That's why I've explicitly named the files `http-(component).(js/html)` — so that it's easier to see the difference, *and* to better know how to migrate multiple 'plain/insecure' WebSocket instances to 'WebSocketSecure' instances on HTTPS. That's the reasoning behind the `WSSRouter`, after all.

</details>

### Both Server-Side Implementations:
Clone into the Repository from the location of your choice.
```
$ git clone https://github.com/Itimoto/Roomba-Roamer
```
Install the Dependencies. Start with the Main Project...
```
$ cd Roomba-Roamer
$ npm install
```
...Then the H264 Player.
```
$ cd vendor
$ npm install
```

<details>
<summary>
For HTTPS:
</summary>

Move your SSL Certs into the SSL Folder. If you used [Let's Encrypt with Certbot](https://certbot.eff.org/) and are running a Unix-based OS, you can just run:

```
$ cd ssl
$ sudo cp /etc/letsencrypt/live/${your.domain.here}/cert.pem cert.pem
$ sudo cp /etc/letsencrypt/live/${your.domain.here}/privkey.pem privkey.pem
$ sudo cp /etc/letsencrypt/live/${your.domain.here}/chain.pem chain.pem
```

Alternatively, do what feels right. I'm not your supervisor.
</details>

<details>
<summary>
For HTTP:
</summary>

Instead of explicitly routing our WebSocket connections through Port 443 (HTTPS) or Port 80 (HTTP), we'll be routing them through Ports 8083 (for the Pi Stream) and 8082 (for general-communication (e.g. Movement commands, Queue information, etc.))

That means that we'll need to modify our firewall a little bit. If the Pi doesn't connect to the Server, you'll want to *open ports 8083 and 8082 on the server*

If you're on **CentOS 6.7**, like me, you *can* shut down the Firewalls. But that would be bad.

```
$ sudo service iptables stop
```

Don't do that. Instead, you can... well, explicitly open them:

```
$ sudo iptables -A INPUT -p tcp -m tcp --dport 8083 -j ACCEPT
$ sudo iptables -A INPUT -p tcp -m tcp --dport 8082 -j ACCEPT
```

If you're running the demo locally, however, firewall-modifications shouldn't be necessary.

</details>

Now, start the server:
```
$ cd ..
$ node http-server.js
```
*Or `https-server.js`. Y'know.*

Finally, navigate to either `http://localhost` or `https://localhost` if you're running the server locally, *or* `http://your.domain.here` or `https://your.domain.here`.


### What about the Roomba itself?
> *Ahh, you got me*

This one's a bit trickier. There's a Software and a Hardware component to it.

#### On Hooking Up With a Roomba
The Pi has plenty of GPIO ports. The ones involved with Serial Comm are 6, 8, & 10:
```
    (('Up' - Towards Display Port, etc.))
    3v3 Power   | 1 [] 2 |  5V Power
    GPIO2 (SDA) | 3 [] 4 |  5V Power
    GPIO3 (SCL) | 5 [] 6 |  GND ----------(!)         
    GPIO4       | 7 [] 8 |  GPIO14 (TXD)--(!)
    GND         | 9 [] 10|  GPIO15 (RXD)--(!)
                |...[]...|
    (('Down' - Towards USB, Eth. etc.))
```
> You can view a better, truer-to-life version [here](https://learn.sparkfun.com/tutorials/raspberry-gpio/gpio-pinout)

A Roomba's Serial Interface Port Looks something like this:
*Thankfully, we only need three wires:*

```
            / |   | \
          / - - - - - \
         |   O  O* O*  |  *: Pin 6, GND; Right - Pin 5, Baudrate Change
         | O* = = =  O*|  *: Left - Pin 4, TXD; Right - Pin 3, RXD
          \   O   O   /
            \ _ _ _ /
```

> Hook up Pin 4 (TXD) on the Roomba to Pin 10 (RX) on the Pi (Yes Voltage Divider)
> Pin 3 (RXD) on the Roomba to Pin 8  (TX) on the Pi (No Voltage Divider)
> And, if you need to change the Baudrate with a pin, hook up Pin 5 (BRC) on the Roomba to a spare GPIO pin on the Pi.

(Use the [documentation](http://anrg.usc.edu/ee579/spring2016/Roomba/iRobot_Roomba_600_Open_Interface_Spec.pdf) to fill in the blanks)

**NOTE! Pay extra-careful attention to hooking those two confused lovebirds up.**
If you mix up the TX and RX on the Roomba and Pi, you'll fry the Pi due to the Logic Voltage Difference (as the Roomba uses 5V Serial Logic, Pi uses 3.3V Serial Logic)

So, when you /do/ hook them up, use a voltage divider to step down the Roomba's Serial TX (5v) to Pi's RX (3v)

The Roomba /can/ detect the Pi's 3v TX, though, so you can hook it up directly there

My setup runs something like this:
```
[Roomba TXD] => 10k Resistor => [Pi RXD] => 22k Res. => GND
```

**Don't smoke your electronics.**

#### On Hooking Up With the Server
The Pi Setup is somewhat-similar to the Server Setup. After SSH-ing into your Pi, clone into the Repository:
```
$ git clone https://github.com/Itimoto/Roomba-Roamer
```
Navigate into the `_pi-specific` directory and install dependencies
```
$ cd _pi-specific
$ npm install
```

Now come the trickier parts: modify the source to fit your configuration.

Once you've jerryrigged your Pi's GPIO pins to your Roomba's Pins, you'll need to enable and check your Serial connection (*and* your Camera Module).
```
$ sudo raspi-config
> 5. Interfacing Options
> P6 Serial
> "No" to Login Shell
> "Yes" to Serial Port Hardware Enable
> 
> 5. Interfacing Options
> P1. Camera
> "Yes" to Camera Interface Enable
```
Now, you'll want to know *where* your serial interface is, [Software-wise](https://www.cyberciti.biz/faq/find-out-linux-serial-ports-with-setserial/).
```
$ dmesg | grep tty
> [    0.001076] console [tty1] enabled
> [    0.982525] 3f201000.serial: ttyAMA0 at MMIO 0x3f201000 (irq = 81, base_baud = 0) is a PL011 rev2
> [    3.640798] systemd[1]: Created slice system-getty.slice.
```
See that `ttyAMA0`? That's your serial interface. Keep a note of it. Now:

<details>
<summary>
HTTP?
</summary>

Start editing the `roomba-pi-http.js` file.

```
$ nano roomba-pi-http.js
```

Make sure the `hostName` variable matches your server's/setup's address.

<details>
<summary>
Local Wifi?
</summary>

Get your Server's local IP (i.e. the device you're running `http-server.js` on) With Windows, you can run `ipconfig` in your Command Prompt.

```
C:\Users> ipconfig
> ...
> IPv4 Address. . . . . . . : 192.168.0.191
```

Then replace `hostName` with the `IPv4 Address`

```js
//-----WS URLs----
const hostName  = "192.168.0.191";
```

And `portName` with the Serial Port you found before:
```js
const op        = require('./lib/roomba-opcodes');  // Makes writing commands easier

const portName  = "/dev/ttyAMA0";
```

</details>

---

</details>

<details>
<summary>
HTTPS?
</summary>

Start editing the `roomba-pi-https.js` file.

```
$ nano roomba-pi-https.js
```

Make sure the `hostName` variable matches your server's/setup's address.

<details>
<summary>
Local Wifi?
</summary>

Get your Server's local IP (i.e. the device you're running `https-server.js` on) With Windows, you can run `ipconfig` in your Command Prompt.

```
C:\Users> ipconfig
> ...
> IPv4 Address. . . . . . . : 192.168.0.191
```

Then replace `hostName` with the `IPv4 Address`

```js
//-----WS URLs----
const hostName  = "192.168.0.191";
```

And `portName` with the Serial Port you found before:
```js
const op        = require('./lib/roomba-opcodes');  // Makes writing commands easier

const portName  = "/dev/ttyAMA0";
```
---

</details>

</details>

Finally, run the program.
```
node roomba-pi-http.js
```
*Or `roomba-pi-https.js`. Y'know.*

<details>
<summary>
What about running it in the background?
</summary>

You'll need a Supervisor for that. I use [PM2](https://medium.com/@andrew.nease.code/set-up-a-self-booting-node-js-eb56ebd05549).

Install PM2

```
$ npm install -g pm2
```

To run it in the background:

```
$ pm2 start roomba-pi-http.js
```

To run it on startup:

```
$ pm2 startup roomba-pi-http.js
```

Y'know.

</details>

---
## Credit Where Credit Is Due.
This project would not have been possible without other, external contributions. Though I'm unsure as to whether to cite them as *contributors* or *vendors*, here lie the external libraries used:

- *131's [H264 Live Player](https://github.com/131/h264-live-player)*
- *PimTerry's [H264 Header-Data Capture Script](https://github.com/pimterry/raspivid-stream/blob/master/index.js)*
- *ey3ball's [Leaky Buffer, coupled with neat exploration and explanation of Stream Backpressuring](http://ey3ball.github.io/)*
- And the remaining *remarkably helpful* tutorials linked to when applicable.
