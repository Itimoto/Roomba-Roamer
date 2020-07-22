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
    <summary>You can implement with HTTP or HTTPS, but you'll need SSL Certificates for the latter. The methods for implementation are slightly different.</summary>
    <p>
    
    You will need SSL Certificates for an HTTPS app. I used [Certbot](https://certbot.eff.org/)

    I built the Roamer as an HTTP app, originally; however, I migrated it to HTTPS/SPDY for better load times and better SEO.

    At the same time, implementing HTTP is *quite* a bit simpler than HTTPS. But there is *still* a difference.

    That's why I've explicitly named the files `http-(component).(js/html)` — so that it's easier to see the difference, *and* to better know how to migrate multiple 'plain/insecure' WebSocket instances to 'WebSocketSecure' instances on HTTPS.

    That is the reasoning behind the `WSSRouter`, after all.

    </p>
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
    <summary>For HTTPS:</summary>
    <p>

    Move your SSL Certs into the SSL Folder. If you used [Let's Encrypt with Certbot](https://certbot.eff.org/) and are running a Unix-based OS, you can just run:

    ```
    $ cd ssl
    $ sudo cp /etc/letsencrypt/live/${your.domain.here}/cert.pem cert.pem
    $ sudo cp /etc/letsencrypt/live/${your.domain.here}/privkey.pem privkey.pem
    $ sudo cp /etc/letsencrypt/live/${your.domain.here}/chain.pem chain.pem
    ```

    Alternatively, do what feels right. I'm not your supervisor.

    </p>
</details>

Now, start the server:
```
$ cd ..
$ node http-server.js
```
*Or `https-server.js`. Y'know.*

### What about the Roomba itself?



---
## Credit Where Credit Is Due.
This project would not have been possible without other, external contributions. Though I'm unsure as to whether to cite them as *contributors* or *vendors*, here lie the external libraries used:

- *131's [H264 Live Player](https://github.com/131/h264-live-player)*
- *PimTerry's [H264 Header-Data Capture Script](https://github.com/pimterry/raspivid-stream/blob/master/index.js)*
- *ey3ball's [Leaky Buffer, coupled with neat exploration and explanation of Stream Backpressuring](http://ey3ball.github.io/)*
- And the remaining *remarkably helpful* tutorials linked to when applicable.
