// Roomba Reference: Summarized form of Roomba 500 Open Interface Spec
//  Also: Serves as a set of 'easily-accessible' opcodes

//  NOTE: All 0xNN represent the Hex representation of the relevant Opcode

const roombaOpcodes = {
    BAUDRATE    :   115200, // Default baudrate

    // Roomba Interface Commands
    START   : 0x80,
    BAUD    : 0x81,
    SAFE    : 0x83,
    FULL    : 0x84,
    POWER   : 0x85, // Powers down Roomba
    SEEKDOCK: 0x8F, // Looks to Recharge

    RESET   : 0x7,  // Resets Roomba as if processor power-cycled.
    STOP    : 0xAD, // Turns off the Roomba; it will no longer respond to commands

    //  Actuator Commands
    DRIVE   : 0x89, // Takes 4 Bytes to complete: [0x89][Velocity High Byte][Velocity low byte][Radius High Byte][Radius low byte]
                    //  Special Cases: Straight: 0x8000, or 7FFF
                    //   Turn in place CW: -1. CCW: 1

    DRIVEDIRECT : 0x91, // Control forward/backward motion of both Roomba's drive wheels independently
                    // Takes 4 Bytes to complete: [0x91][Right vel. high byte][Right vel. low byte][Left vel. high byte][Left vel. low byte]
    
    MOTORS  : 0x8A, //  Control Roomba's main brush, side bruch, & vacuum independently
                    // [0x8A][Motors], where Bits 0-2: 0=Off,1=On; Bits 3-4: 0=Default Direction, 1=Opposite Direction
                    //  If we lay out the byte: [Res][Res][Res][MainBrushDirection][SideBrushCW?][MainBrush][Vacuum][SideBrush]
                    //  Note: the last [Res] is bit 7, [SideBrush] is bit 0

    //  Music Commands
    SONG    : 0x8C, //  Sets up a song to record
                    // [0x8C][Song Number][Song Length][Note Number 1][Note Number 1 Duration][Note Number 2][Note Duration 2], etc.
                    //  Song Number: 0-4; Song Length: 1-16
                    //  Note Number: 31-127 (Pitch of musical note, according to MIDI note numbering scheme))
                    //  Note Duration: 0-255 (Duration, in increments of 1/64th of a sec)(e.g. 1/2-Sec Note is '32')
    PLAY    : 0x8D, //  Plays a song
                    // [0x8D][Song Number 0-4]
    C4  : 0x3C,
    Db4 : 0x3D,
    D4  : 0x3E,
    Eb4 : 0x3F,
    E4  : 0x40,
    F4  : 0x41,
    Gb4 : 0x42,
    G4  : 0x43,
    Ab4 : 0x44,
    A4  : 0x45,
    Bb4 : 0x46,
    B4  : 0x47,
    C5  : 0x48,

    // Sensor Commands
    SENSORS     : 0x8E, // Lets us ask for a single packet of Sensor data Bytes
    QUERY       : 0x95, // Lets us ask for a list of sensor packets; [0x95][Number of Packets][Packet ID 1][Pack. ID 2], etc.
    GET_vBATT   : 0x16, // Indicates Batt. Voltage;                 Range: 0-65535mV
    GET_CURR    : 0x17, // Indicates Curr. Flowing in/out of Batt.  Range: -32768-32768mA
    GET_iBATT   : 0x19, // Indicates Batt. Current;                 Range: 0-65535mAh 

    //  MOVEMENT Pre-set (These are NOT Roomba Opcodes, but are instead self-generated constants for internal use)
    SLOWROT : 0xC0,
    SENDTOROOMBA    : 0xAA,
}

module.exports = roombaOpcodes;

/*-----------------------------------------------------------------
General Notes about hooking up with a Roomba:
(First, get your head out of the gutter. Afterwards...)

The Pi has plenty of GPIO ports. The ones involved with Serial Comm are 6, 8, & 10:
    (('Up' - Towards Display Port, etc.))
    3v3 Power   | 1 [] 2 |  5V Power
    GPIO2 (SDA) | 3 [] 4 |  5V Power
    GPIO3 (SCL) | 5 [] 6 |  GND ----------(!)         
    GPIO4       | 7 [] 8 |  GPIO14 (TXD)--(!)
    GND         | 9 [] 10|  GPIO15 (RXD)--(!)
                |...[]...|
    (('Down' - Towards USB, Eth. etc.))

A Roomba's Serial Interface Port Looks something like this:
   Thankfully, we only need three wires:

            / |   | \
          / - - - - - \
         |   O  O* O*  |  *: Pin 6, GND; Right - Pin 5, Baudrate Change
         | O* = = =  O*|  *: Left - Pin 4, TXD; Right - Pin 3, RXD
          \   O   O   /
            \ _ _ _ /

    Hook up Pin 4 (TXD) on the Roomba to Pin 10 (RX) on the Pi (Yes Voltage Divider)
            Pin 3 (RXD) on the Roomba to Pin 8  (TX) on the Pi (No Voltage Divider)
            
    And, if you need to change the Baudrate with a pin, hook up 
        Pin 5 (BRC) on the Roomba to a spare GPIO pin on the Pi.
        (Use the documentation to fill in the blanks)

NOTE! Pay extra-careful attention to hooking those two confused lovebirds up.
    If you mix up the TX and RX on the Roomba and Pi, you'll fry the Pi
     due to the Logic Voltage Difference (Roomba uses 5V Serial Logic,
     Pi uses 3.3V Serial Logic)
    So, when you /do/ hook them up, use a voltage divider to step down the 
     Roomba's Serial TX (5v) to Pi's RX (3v)
    The Roomba /can/ detect the Pi's 3v TX, though, so you can hook it up
     directly there

    My setup ran something like this:
        [Roomba TXD] => 10k Resistor => [Pi RXD] => 22k Res. => GND

Don't smoke your electronics.
------------------------------------------------------------------*/