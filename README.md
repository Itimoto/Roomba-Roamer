# Roomba-Roamer
Control a Roomba over the Web!

---

<a href="https://famine.potato.irish/pong" target="_blank">
  <img src="https://raw.githubusercontent.com/Itimoto/Potato.Irish-Server/master/public/images/jpg/rr-display.jpg" 
  alt="The Roomba in its unnatural habitat" />
</a>

> Currently running over on [potato.irish](https://famine.potato.irish/rr)

You may be wondering about what *exactly* is going on here.

>(Heh. Like you'll get a straight answer)   

I carved out two months of my life to bring you this... *thing*. It's a [Roomba](https://www.irobot.com/). You know them -- those funky little fellas that they are. That doesn't really explain what's happening here, however...

---

## How To *Roam*
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

## Pong Information:
This is just your classic, everyday game of **Pong**. No surprises here. Nada.
> Fun Fact: It took less time but **more code** to build online Pong from scratch than it did to build the Roomba Roamer. Think about it as you curse at the latency.

You'll be greeted with a standard screen. The in-game details are in the in-game Help Menu. Here's a clarification of the menu:
> `PlayerX: Queueing` -- I couldn't pair you up with someone at the moment. You'll need to wait until someone else joins in.
> `PlayerX: Waiting` -- I got you a partner, and they may/may-not-have hit the 'Ready' button yet. Even if you hit 'Ready', you're not guaranteed that the Other Player has hit 'Ready' already. Alrighty?
> `PlayerX: You` -- You are PlayerX. This'll give you a hint on ***where*** you are on the gamescreen.
> `Button: Ready` -- For our purposes here, it 'lets the server know you're ready'. It doesn't, really, on the backend. It's deceptive, like the price of post-secondary education. But it's something. I'm very tired.