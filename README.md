# diyaudioplayer.js

## Overview

_diyaudioplayer.js_ provides a basic API that can be used to build your own customized audio player, and embed it on your own web site.

The script itself handles the most basic functionality you would expect from an audio player that can read playlists and play audio.

The DIY part comes into play when you integrate the player into your own web site, and wire up or customize the user interface elements.

Every web site is different. You can use some or all of the basic UI elements that are included to get you started. But none of them are required in order to use the core functionality of the module. You can start with the basic UI elements, and slowly customize your interface more and more, all the way up to the point where you seamlessly transition to a fully custom interface.

Use as much, or as little, of *diyaudioplayer.js* as you like. It does this one thing, and tries to make the smallest number of assumptions about your web site as possible.

**Official Website:** https://nathanrosenquist.com/diyaudioplayer.js/

## Getting Started

Include *diyaudioplayer.js* from an HTML file:

    <script src="diyaudioplayer.js"></script>

*diyaudioplayer.js* defines a single global variable called `diyaudioplayer`.
This serves as a sort of *JavaScript* pseudo-namespace that contains everything
in the module. All of your interactions with *diyaudioplayer.js* will be through
this namespace, and its public functions.

### Create a JSON playlist, with the following format

    playlist = [
        {
            "url": "/mp3/01.mp3"
        },
        {
            "url": "/mp3/01.mp3"
        },
        {
            "url": "/mp3/01.mp3"
        }
    ]

Feel free to add other keys to the objects in the list. However, the basic structure of the playlist being an array of objects, and each object containing a `url` entry that points to a file to play, is required.

### Initialize *diyaudioplayer.js* after the page loads

    <body onload="diyaudioplayer.init(playlist)">

At this point, you are at a fork in the road.

You can either use some or all of the provided basic UI assets as a starting point, or build your own interface completely from scratch. You can also mix and match, and customize things however you like. You can use as much, or as little, of the basic user interface as you need.

We'll start by describing the basic user interface, and proceed into more complex configurations.

## Basic User Interface

[Basic User Interface Example](examples/basic.html)

If you want to use the included assets as a starting point, follow the steps in this section. You can still customize anything and everything, but the *diyaudioplayer.js* script has special (optional) support for some basic UI elements, if it can find them on the HTML page.

If you don't want to use any of the basic user interface elements, then feel free to skip ahead and ignore this section.

Put the included navigation image assets in a directory on your web site. We'll assume they are in `/audionav/` in this document for the sake of concreteness, but you can put them anywhere.

Call the following *JavaScript* function somewhere on your page before or immediately after `diyaudioplayer.init()` is called. The argument should point to the URL path (including the trailing slash) where the control images can be found:

    diyaudioplayer.setBaseImageUrl("/audionav/");

### Add the *Play/Pause* button to the HTML page

    <a onclick="diyaudioplayer.playPause()" style="cursor: pointer;">
        <img id="diyAudioPlayPauseButton" src="/audionav/play.png">
    </a>

The `diyaudioplayer.playPause()` function toggles the audio player between play and pause.

The `cursor: pointer` CSS style element makes it so that when you roll over the `A` tag, your cursor turns into a hand. By doing it this way, the *JavaScript* function name doesn't show up in the browser status bar like it would with an `A` `href` link.

The `IMG` `id` setting tells *diyaudioplayer.js* that this image corresponds to the play/pause button. When the play/pause status is toggled, *diyaudioplayer.js* will toggle the `src` property of the image between `play.png` and `pause.png`. The icon displayed will always be the one that corresponds to the action that will happen if the user clicks on the button.

The following images in the base image URL path will be used if the `diyAudioPlayPauseButton` `IMG` element `id` is enabled:

 - `play.png`
 - `pause.png`

### Add the playback position slider

    <input type="range" id="diyAudioPlaybackPosition" value="0">

The `id` setting tells *diyaudioplayer.js* that this is the slider bar that controls and represents the position in the track. During `diyaudioplayer.init()`, *diyaudioplayer.js* will set up several event handlers to link this slider up with the `HTMLAudioElement` object responsible for audio playback.

When the user moves the slider, it will update the position of audio playback.

When audio is playing back, the position of the slider will be updated to match the current position of playback.

When audio is played for the first time, the `pointer-events: none` CSS style will be removed from this element.

The `value="0"` attribute sets the slider to the left side, at the beginning of the track, before playback has started.

### Add some combination of the elapsed/remaining/duration time display elements

    <span id="diyAudioTimeElapsed">--:--</span>
    <span id="diyAudioTimeRemaining">--:--</span>
    <span id="diyAudioTimeDuration">--:--</span>

These don't have to be `SPAN` tags. Assigning a monospace font to these elements is worth considering.

Typically you would want *remaining*, or *duration*, but maybe not both.

The `id` fields tell *diyaudioplayer.js* that these elements are designated for displaying the elapsed/remaining/duration times for the track. As the track plays, or the user drags the playback position slider, the values inside of these tags will be updated and replaced frequently.

The `--:--` entries inside of the tags are intended to represent an initial starting state that will be replaced immediately as soon as a track is loaded. Note that mobile browsers may defer loading until as late as possible to save bandwidth.

It is possible to set the *no time* value using the `diyaudioplayer.setNoTimeDisplay()` function. If you set this to something other than `--:--`, update these values inside of the tags to match that value.

### Add previous track / next track buttons

    <a onclick="diyaudioplayer.prevTrack()"
       id="diyAudioPrevTrackLink"
       style="cursor: pointer;">
            <img id="diyAudioPrevTrackImg" src="/audionav/prev.png">
    </a>

    <a onclick="diyaudioplayer.nextTrack()"
       id="diyAudioNextTrackLink"
       style="cursor: pointer;">
            <img id="diyAudioNextTrackImg" src="/audionav/next.png">
    </a>

The `diyaudioplayer.prevTrack()` and `diyaudioplayer.nextTrack()` functions tell *diyaudioplayer.js* to skip to the previous or next track, respectively.

The id fields tell *diyaudioplayer.js* that these elements represent the `A` links and `IMG` elements, respectively. *diyaudioplayer.js* has built-in support to enable and disable these links, and show alternate *disabled* images, when the playlist is at the very first track or the very last track.

If you don't want this behavior, you can just omit the `id` fields.

If you don't disable the previous / next track buttons in this manner, then pressing them will cause the track skipping to up loop around to the beginning or end of the playlist, respectively.

The following images in the base image URL path will be used if these elements are enabled:

 - `prev.png`
 - `next.png`
 - `prev-disabled.png`
 - `next-disabled.png`

### Add links to the individual tracks in the playlist

*diyaudioplayer.js* does not have built-in support for displaying the list of tracks. This is where the DIY part starts to come into play.

Ideally, you can use the same playlist JSON data source to generate these dynamically, using a static site generator, server-side back-end language, or even *JavaScript* to generate this part of the HTML page.

Construct links to each element in the playlist, where each link target corresponds to the index into the playlist array that you passed into `diyaudioplayer.init()`

    <a onclick="diyaudioplayer.playTrack(0)"
        style="cursor: pointer;">Track 1</a>

    <a onclick="diyaudioplayer.playTrack(1)"
        style="cursor: pointer;">Track 2</a>

    <a onclick="diyaudioplayer.playTrack(2)"
        style="cursor: pointer;">Track 3</a>

At this point, you should have a fully-functional proof of concept audio player with a basic user interface. You are strongly encouraged to move all of the basic elements around on the page, and to style everything with CSS.

And consider adding a few basic event handler functions to further customize your interface.

## Adding Basic Event Handlers

[Basic Event Handlers Example](examples/basic-event-handlers.html)

The next step in customization is to define some basic event handlers, and register them with *diyaudioplayer.js*, so that you can run custom code when certain events happen, and update the UI or take other action accordingly.

There are four basic events that you can register custom handler functions for:

 - Play
 - Pause
 - Stop
 - Track Change

Note that many modern audio player interfaces do not actually have a stop button. You may find that a single *Play/Pause* toggle button is all you need.

If you don't have a *Stop* button that invokes `diyaudioplayer.stop()`, then the stop handler function won't ever be called.

If you have a *Play/Pause* toggle button (like the one in the basic UI), then both the *Play* and *Pause* event handlers will be triggered, respectively, when the state is toggled back and forth.

If you have separate *Play* and *Pause* buttons, each one will trigger its own handler, respectively.

### Example Play Handler Function

    function handlePlay() {
        console.log("play");
    }

### Example Pause Handler Function

    function handlePause() {
        console.log("pause");
    }

### Example Stop Handler Function

    function handleStop() {
        console.log("stop");
    }

### Example Track Change Handler Function

    // Accepts playlistIndex, which is an index into the playlist JSON array
    //
    // This example assumes that the current playlist
    // (e.g. that you passed to diyaudioplayer.init())
    // can be referenced as "playlist" in the scope this function is defined
    //
    // HINT: add other keys to your playlist objects besides "url",
    //       and use them to update the UI with the song title,
    //       custom images, etc.
    function handleTrackChange(playlistIndex) {
        console.log(
            "track change (" + playlistIndex + "), url: " +
            playlist[playlistIndex]["url"]
        );
    }

Once you have defined any of these functions, they must be registered with *diyaudioplayer.js*, so that they will be called at the right times. Below you can find example invocations that will register the example handler functions defined above. You only need to register functions that you have defined, and want to be triggered on their corresponding events.

    diyaudioplayer.registerPlayHandler(handlePlay);
    diyaudioplayer.registerPauseHandler(handlePause);
    diyaudioplayer.registerStopHandler(handleStop);
    diyaudioplayer.registerTrackChangeHandler(handleTrackChange);

Each user-defined function is executed inside of a `try/catch` block. In case your function encounters any errors, check the *JavaScript* console in your browser to see the error messages.

## Fully Custom User Interface

[Customized Example](examples/customized.html)

If you want to build a complete user interface from scratch, and not use any of the default UI settings, follow the steps in this section. You can still use the included assets however you like, but this section assumes that you won't be using any of the special integration that *diyaudioplayer.js*
has with the basic UI elements. Instead, you'll need to define and register callback functions to be notified about various events, and then build your user interface so that it responds to those callbacks.

*diyaudioplayer.js* works perfectly well without any user interface whatsoever (with the caveat that autoplay is disabled in most browsers, and it needs some sort of user action to get it going). If you wire up UI elements into its public API, you can build your own interface entirely from scratch, and
just let *diyaudioplayer.js* handle the audio playback part.

In this case, see the *Public Functions* documentation, and just add the elements you need for your particular situation.

To get started, look at some of the basic transport functions, especially:

    diyaudioplayer.playPause()
    diyaudioplayer.prevTrack()
    diyaudioplayer.nextTrack()

There are a lot more functions besides these. But if you call `diyaudioplayer.init()` with a playlist as described earlier, and wire these functions up to some links, you should be able to do some basic playback and navigation.

An extremely simple proof of concept interface to get you started:

    <a onclick="diyaudioplayer.playPause()"
        style="cursor: pointer;">Play/Pause</a>

    <a onclick="diyaudioplayer.prevTrack()"
        style="cursor: pointer;">Previous Track</a>

    <a onclick="diyaudioplayer.nextTrack()"
        style="cursor: pointer;">Next Track</a>

You will almost certainly want to write your own callback handler functions to be notified of various events, and then update your UI when those functions are called. See the *Adding Basic Event Handlers* section above for the details.

You may also want to look into the `diyaudioplayer.getAudio()` function, which returns a reference to the `HTMLAudioElement` / `Audio` object. *diyaudioplayer.js* creates several event listeners to tie the `Audio` object into an `INPUT type="range"` slider with its basic UI support.

If you want to provide the ability to seek to different parts of the track, and get visual confirmation of the playback position, consider using the basic UI playback position slider. If you don't want to use the basic UI playback position slider, then you will almost certainly need to write custom event listeners that tie into the `Audio` object and your preferred methods of displaying and receiving track time updates and requests.

## Public Functions

Here is the complete list of available public functions:

    diyaudioplayer.init(userPlaylist)
    diyaudioplayer.loadPlaylist(userPlaylist)
    diyaudioplayer.setBaseImageUrl(baseImageUrl)
    diyaudioplayer.play()
    diyaudioplayer.stop()
    diyaudioplayer.pause()
    diyaudioplayer.playPause()
    diyaudioplayer.isPlaying()
    diyaudioplayer.seek(seconds)
    diyaudioplayer.prevTrack()
    diyaudioplayer.nextTrack()
    diyaudioplayer.playTrack(trackIndex)
    diyaudioplayer.getCurrentPlaylistIndex()
    diyaudioplayer.secondsToDisplayTime(seconds)
    diyaudioplayer.setNoTimeDisplay(value)
    diyaudioplayer.enableDisplayTimeZeroPad()
    diyaudioplayer.getAudio()
    diyaudioplayer.registerPlayHandler(playHandler)
    diyaudioplayer.registerPauseHandler(pauseHandler)
    diyaudioplayer.registerStopHandler(stopHandler)
    diyaudioplayer.registerTrackChangeHandler(trackChangeHandler)

You can call these as needed, regardless of whether you are using the
basic user interface, a fully custom user interface, or something in between.

See the *PUBLIC FUNCTIONS* section in the *diyaudioplayer.js* source code file for more information. Each function there has header comments with usage instructions.

## Example Code

See the included example HTML files for working demo code you can learn from and modify.

[Basic User Interface Example](examples/basic.html)

[Basic Event Handlers Example](examples/basic-event-handlers.html)

[Customized Example](examples/customized.html)

