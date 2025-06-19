//////////////////////////////////////////////////////////////////////////////
// diyaudioplayer.js                                                        //
// by Nathan Rosenquist                                                     //
//                                                                          //
// Copyright (c) 2025 Nathan Rosenquist                                     //
//                                                                          //
// https://nathanrosenquist.com/diyaudioplayer.js/                          //
//////////////////////////////////////////////////////////////////////////////
// SPDX-License-Identifier: MIT

"use strict";

// BEGIN NAMESPACE
const diyaudioplayer = {};
{

//////////////////////////////////////////////////////////////////////////////
// CONSTANTS                                                                //
//////////////////////////////////////////////////////////////////////////////

// basic UI HTML and CSS elements we might need to refer to by their
// HTML id attributes or CSS class names
const UI_PLAY_PAUSE_BUTTON_ID  = "diyAudioPlayPauseButton";
const UI_PLAYBACK_POSITION_ID  = "diyAudioPlaybackPosition";
const UI_TIME_ELAPSED_ID       = "diyAudioTimeElapsed";
const UI_TIME_REMAINING_ID     = "diyAudioTimeRemaining";
const UI_TIME_DURATION_ID      = "diyAudioTimeDuration";
const UI_PREV_TRACK_LINK_ID    = "diyAudioPrevTrackLink";
const UI_NEXT_TRACK_LINK_ID    = "diyAudioNextTrackLink";
const UI_PREV_TRACK_IMG_ID     = "diyAudioPrevTrackImg";
const UI_NEXT_TRACK_IMG_ID     = "diyAudioNextTrackImg";

// basic UI images we might need to find under the base image URL
const UI_PLAY_IMG              = "play.png";
const UI_PAUSE_IMG             = "pause.png";
const UI_PREV_IMG              = "prev.png";
const UI_NEXT_IMG              = "next.png";
const UI_PREV_DISABLED_IMG     = "prev-disabled.png";
const UI_NEXT_DISABLED_IMG     = "next-disabled.png";

//////////////////////////////////////////////////////////////////////////////
// VARIABLES                                                                //
//////////////////////////////////////////////////////////////////////////////

// HTMLAudioElement that actually plays back the audio tracks
const audio = new Audio();

// playlist reference
let playlist = null;

// current playlist index
let playlistIndex = 0;

// is the audio player currently playing?
let playing = false;

// if we try to play an audio track, and it doesn't work, remember which track
// we were trying to play in case we want to try again later
let deferredAudioSrc = null;

// on some browsers (at least Safari on the iPhone), if you try to seek the
// audio before it has ever played or loaded, strange things happen.
// this lets us accept a seek request before anything has ever started playing,
// and then deliver it when the Audio object is ready to hear about it.
let deferredInitialSeekTime = null;

// time display string for when there is no time information
let noTime = "--:--";

// should display time minutes be padded with zeroes?
let displayTimeZeroPad = false;

// base image URL for player control images
let uiBaseImageUrl = null;

// is the user adjusting the time slider for the track right now?
let uiUserIsAdjustingTimeSlider = false;

// preload cache for navigation control images
const uiPreloadImageCache = {};

// user-defined functions
let udfPlayHandler = null;
let udfPauseHandler = null;
let udfStopHandler = null;
let udfTrackChangeHandler = null;

// previous track index sent to the user-defined track change handler function
let udfPrevTrackChangeHandlerIndex = null;

//////////////////////////////////////////////////////////////////////////////
// PUBLIC FUNCTIONS                                                         //
//////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////
//                                                                          //
// Initializes the DIY Audio Player                                         //
//                                                                          //
// Arguments                                                                //
//                                                                          //
//   userPlaylist (required)                                                //
//     Array of objects, each having a "url" entry pointing to a URL where  //
//     a playable audio file can be loaded.                                 //
//                                                                          //
//     Example:                                                             //
//       playlist = [{"url": "/mp3/01.mp3"}, {"url": "/mp3/02.mp3"}];       //
//                                                                          //
// Usage:                                                                   //
//                                                                          //
//   <body onload="diyaudioplayer.init(playlist)">                          //
//                                                                          //
//////////////////////////////////////////////////////////////////////////////

function init(userPlaylist) {
    // set up bidirectional event listeners to link the Audio object
    // with some of the basic UI elements
    uiAddEventListeners();

    // load the user playlist
    loadPlaylist(userPlaylist);

    // preload navigation control images, if we're using basic UI elements
    uiPreloadImages();
}

//////////////////////////////////////////////////////////////////////////////
//                                                                          //
// Load a new playlist                                                      //
//                                                                          //
// Arguments                                                                //
//   userPlaylist (required)                                                //
//     This is the exact same sort of playlist that gets passed to init()   //
//                                                                          //
//////////////////////////////////////////////////////////////////////////////

function loadPlaylist(userPlaylist) {
    // validate playlist, and keep a reference to it
    if (userPlaylist === undefined) {
        throw new Error("playlist not found");
    }
    if (0 == userPlaylist.length) {
        throw new Error("playlist can not be empty");
    }
    for (let i=0; i < userPlaylist.length; i++) {
        if (! ("url" in userPlaylist[i])) {
            throw new Error("playlist missing 'url' at playlist index " + i);
        }
    }
    playlist = userPlaylist;
    playlistIndex = 0;

    const wasPlaying = playing;

    // if a track was playing before this, pause it
    if (wasPlaying) {
        pause();
    }

    // clear deferred variables from previous playlist
    deferredAudioSrc = null;
    deferredInitialSeekTime = null;

    // initialize the audio player with the first track on the new playlist
    audio.src = playlist[playlistIndex]["url"];

    // update the track skip buttons
    // (which may disable the prev button if we were
    // already on the first track)
    uiUpdateTrackSkipButtons();

    // invalidate previous user-defined playlistIndex from the old playlist,
    // and call the user-defined track change function for the new playlist
    udfPrevTrackChangeHandlerIndex = null;
    handleUdfTrackChange(playlistIndex);

    // if we were in play mode before, start playing the new playlist
    if (wasPlaying) {
        play();
    }
}

//////////////////////////////////////////////////////////////////////////////
//                                                                          //
// Set the base URL for player control images                               //
//                                                                          //
// The trailing slash in the URL must be included                           //
//                                                                          //
// Example:                                                                 //
//   /audionav/                                                             //
//                                                                          //
//////////////////////////////////////////////////////////////////////////////

function setBaseImageUrl(baseImageUrl) {
    uiBaseImageUrl = baseImageUrl;
}

//////////////////////////////////////////////////////////////////////////////
//                                                                          //
// Play                                                                     //
//                                                                          //
//////////////////////////////////////////////////////////////////////////////

function play() {
    const wasAlreadyPlaying = playing;

    // remember that we are playing
    playing = true;

    // if we have a deferred file to load, this is the time to load it
    if (null != deferredAudioSrc) {
        audio.src = deferredAudioSrc;
        deferredAudioSrc = null;
    }

    // if we have a deferred initial seek time,
    // this is the time to seek
    if (null != deferredInitialSeekTime) {
        audio.currentTime = deferredInitialSeekTime;
        deferredInitialSeekTime = null;
    }

    // start audio playback
    let playPromise = audio.play();

    // if playback doesn't start, update our state to reflect reality
    playPromise.catch((error) => {
        // log an error to the console
        console.error("error playing " + audio.src);
        console.error(error);

        // remember which file we were trying to play
        deferredAudioSrc = audio.src;

        // we just found out that we aren't actually playing
        pause();

        // update the play/pause button
        uiUpdatePlayPauseButton();
    });

    // set the play state interval handler
    setPlayStateIntervalHandler();

    // update the play/pause button
    uiUpdatePlayPauseButton();

    // call user-defined functions
    handleUdfTrackChange(playlistIndex);
    if (! wasAlreadyPlaying) {
        handleUdfPlay();
    }
}

//////////////////////////////////////////////////////////////////////////////
//                                                                          //
// Stop                                                                     //
//                                                                          //
//////////////////////////////////////////////////////////////////////////////

function stop() {
    // remember that we are not playing
    playing = false;

    // pause audio playback
    audio.pause();

    // clear deferred initial seek time
    deferredInitialSeekTime = null;

    // seek to the beginning
    audio.currentTime = 0;

    // reset playback position
    uiSetPlaybackPosition(0);

    // update the play/pause button
    uiUpdatePlayPauseButton();

    // update elapsed/remaining time counter HTML display elements
    uiUpdateStatus();

    // call user-defined function
    handleUdfStop();
}

//////////////////////////////////////////////////////////////////////////////
//                                                                          //
// Pause                                                                    //
//                                                                          //
//////////////////////////////////////////////////////////////////////////////

function pause() {
    // remember that we are not playing
    playing = false;

    // pause audio playback
    audio.pause();

    // update the play/pause button
    uiUpdatePlayPauseButton();

    // update elapsed/remaining time counter HTML display elements
    uiUpdateStatus();

    // call user-defined function
    handleUdfPause();
}

//////////////////////////////////////////////////////////////////////////////
//                                                                          //
// Play / Pause                                                             //
//                                                                          //
//////////////////////////////////////////////////////////////////////////////

function playPause() {
    if (playing) {
        pause();
    } else {
        play();
    }
}

//////////////////////////////////////////////////////////////////////////////
//                                                                          //
// Is the audio player currently playing?                                   //
//                                                                          //
// Returns true if the player is currently playing, or false otherwise      //
//                                                                          //
//////////////////////////////////////////////////////////////////////////////

function isPlaying() {
    return playing;
}

//////////////////////////////////////////////////////////////////////////////
//                                                                          //
// Seek                                                                     //
//                                                                          //
// Arguments                                                                //
//                                                                          //
//   seconds (required)                                                     //
//     Location to seek to in the current audio track                       //
//                                                                          //
//////////////////////////////////////////////////////////////////////////////

function seek(seconds) {
    // if we are currently playing
    if (playing) {
        // tell the running audio player to seek to the specified time
        audio.currentTime = seconds;

    // if we are not currently playing
    } else {
        // remember the requested seek time for later
        deferredInitialSeekTime = seconds;

        // maybe update the playback position slider
        if (! uiUserIsAdjustingTimeSlider) {
            let percent = 0;
            if (audio.duration > 0) {
                percent = seconds / audio.duration * 100;
            }

            // update the playback position slider
            uiSetPlaybackPosition(percent);
        }
    }

    // update elapsed/remaining time counter HTML display elements
    uiUpdateStatus();
}

//////////////////////////////////////////////////////////////////////////////
//                                                                          //
// Go to and play the previous track                                        //
//                                                                          //
//////////////////////////////////////////////////////////////////////////////

function prevTrack() {
    // set the playlist index to the previous track
    // wrap around again to the end if we're already on the first track
    if (0 == playlistIndex) {
        playlistIndex = playlist.length - 1;
    } else {
        playlistIndex--;
    }

    // clear deferred variables
    deferredAudioSrc = null;
    deferredInitialSeekTime = null;

    // load the new track in the audio player
    audio.src = playlist[playlistIndex]["url"];

    // set playback position
    uiSetPlaybackPosition(0);

    // update the track skip buttons
    // (which may disable the prev button if we were
    // already on the first track)
    uiUpdateTrackSkipButtons();

    // call user-defined functions
    handleUdfTrackChange(playlistIndex);

    // start audio playback, if it wasn't started already
    play();
}

//////////////////////////////////////////////////////////////////////////////
//                                                                          //
// Go to and play the next track                                            //
//                                                                          //
//////////////////////////////////////////////////////////////////////////////

function nextTrack() {
    // set the playlist index to the next track
    // wrap around to the beginning if we're already on the last track
    if (playlistIndex == (playlist.length - 1)) {
        playlistIndex = 0;
    } else {
        playlistIndex++;
    }

    // clear deferred variables
    deferredAudioSrc = null;
    deferredInitialSeekTime = null;

    // load the new track in the audio player
    audio.src = playlist[playlistIndex]["url"];

    // reset playback position
    uiSetPlaybackPosition(0);

    // update the track skip buttons
    // (which may disable the next button if we were
    // already on the last track)
    uiUpdateTrackSkipButtons();

    // call user-defined functions
    handleUdfTrackChange(playlistIndex);

    // start audio playback, if it wasn't started already
    play();
}

//////////////////////////////////////////////////////////////////////////////
//                                                                          //
// Go to and play the specified track                                       //
//                                                                          //
// Arguments                                                                //
//                                                                          //
//   trackIndex (required)                                                  //
//     Index into the playlist                                              //
//                                                                          //
//////////////////////////////////////////////////////////////////////////////

function playTrack(trackIndex) {
    // if the track index is out of range, just ignore the request
    if ((trackIndex < 0) || (trackIndex >= playlist.length)) {
        return;
    }

    // if we are being asked to go to a different track than the one
    // that is already selected in the player, load it up now
    if (trackIndex != playlistIndex) {
        playlistIndex = trackIndex;
        audio.src = playlist[playlistIndex]["url"];
    }

    // update the track skip buttons,
    // if we've landed at either end of the playlist
    uiUpdateTrackSkipButtons();

    // update elapsed/remaining time counter HTML display elements
    uiUpdateStatus();

    // clear deferred variables
    deferredAudioSrc = null;
    deferredInitialSeekTime = null;

    // start audio playback, if it wasn't started already
    play();
}

//////////////////////////////////////////////////////////////////////////////
//                                                                          //
// Get the playlist index for the selected playlist track                   //
//                                                                          //
//////////////////////////////////////////////////////////////////////////////

function getCurrentPlaylistIndex() {
    return playlistIndex;
}

//////////////////////////////////////////////////////////////////////////////
//                                                                          //
// Formats a given number of seconds as a human-readable display time       //
//                                                                          //
// Arguments                                                                //
//                                                                          //
//   seconds (required)                                                     //
//     An integer or floating point number of seconds,                      //
//     either positive or negative                                          //
//                                                                          //
// Returns                                                                  //
//                                                                          //
//   String representing the given number of seconds in hours, minutes,     //
//   and seconds, suitable for display in elapsed/remaining/duration time   //
//   displays in the user interface.                                        //
//                                                                          //
//   If invalid input is provided, then the "no time" string is returned.   //
//   This can be customized using the setNoTimeDisplay() function.          //
//                                                                          //
//////////////////////////////////////////////////////////////////////////////

function secondsToDisplayTime(seconds) {
    if (Number.isNaN(seconds)) {
        return noTime;
    }

    const intTotalSeconds = Math.round(Math.abs(seconds));
    if (Number.isNaN(intTotalSeconds)) {
        return noTime;
    }

    const intHours = Math.floor(intTotalSeconds / 3600);
    if (Number.isNaN(intHours)) {
        return noTime;
    }

    const intMinutes = Math.floor(intTotalSeconds / 60);
    if (Number.isNaN(intMinutes)) {
        return noTime;
    }

    const intSeconds = Math.round(intTotalSeconds % 60);
    if (Number.isNaN(intSeconds)) {
        return noTime;
    }

    const maybeNegative = (seconds < 0) ? "-" : "";

    let strMinutes = "" + intMinutes;
    if (displayTimeZeroPad) {
        if (intMinutes < 10) {
            strMinutes = "0" + intMinutes;
        }
    }

    let strSeconds = "" + intSeconds;
    if (intSeconds < 10) {
        strSeconds = "0" + intSeconds;
    }

    if (intHours > 0) {
        let strHours = "" + intHours;
        let modMinutes = (intMinutes % 60);
        strMinutes = "" + modMinutes;
        if (modMinutes < 10) {
            strMinutes = "0" + modMinutes;
        }

        return maybeNegative + strHours + ":" + strMinutes + ":" + strSeconds;
    }

    return maybeNegative + strMinutes + ":" + strSeconds;
}

//////////////////////////////////////////////////////////////////////////////
//                                                                          //
// Set the display string that represents no time                           //
//                                                                          //
// The default is 0:00                                                      //
//                                                                          //
//////////////////////////////////////////////////////////////////////////////

function setNoTimeDisplay(value) {
    noTime = value;
}

//////////////////////////////////////////////////////////////////////////////
//                                                                          //
// Enable the zero-padding of minutes in time displays                      //
//                                                                          //
// The default is disabled                                                  //
//                                                                          //
// Examples                                                                 //
//   zero-padding disabled: 0:42                                            //
//   zero-padding enabled:  00:42                                           //
//                                                                          //
//////////////////////////////////////////////////////////////////////////////

function enableDisplayTimeZeroPad() {
    displayTimeZeroPad = true;
}

//////////////////////////////////////////////////////////////////////////////
//                                                                          //
// Returns the HTMLAudioElement used for audio playback, which was          //
// created during init()                                                    //
//                                                                          //
// This is generally only required if you want to make advanced             //
// UI customizations, and add custom event listeners, instead of using the  //
// default interface elements.                                              //
//                                                                          //
//////////////////////////////////////////////////////////////////////////////

function getAudio() {
    return audio;
}

//////////////////////////////////////////////////////////////////////////////
//                                                                          //
// Register a user-defined play handler function                            //
//                                                                          //
// This function will be called whenever playback is started                //
//                                                                          //
// The user-defined function must not accept any arguments                  //
//                                                                          //
// No return value is required, or used                                     //
//                                                                          //
//////////////////////////////////////////////////////////////////////////////

function registerPlayHandler(playHandler) {
    udfPlayHandler = playHandler;
}

//////////////////////////////////////////////////////////////////////////////
//                                                                          //
// Register a user-defined pause handler function                           //
//                                                                          //
// This function will be called whenever playback is paused                 //
// (but not stopped)                                                        //
//                                                                          //
// The user-defined function must not accept any arguments                  //
//                                                                          //
// No return value is required, or used                                     //
//                                                                          //
//////////////////////////////////////////////////////////////////////////////

function registerPauseHandler(pauseHandler) {
    udfPauseHandler = pauseHandler;
}

//////////////////////////////////////////////////////////////////////////////
//                                                                          //
// Register a user-defined stop handler function                            //
//                                                                          //
// This function will be called whenever playback is stopped                //
// (but not paused)                                                         //
//                                                                          //
// The user-defined function must not accept any arguments                  //
//                                                                          //
// No return value is required, or used                                     //
//                                                                          //
//////////////////////////////////////////////////////////////////////////////

function registerStopHandler(stopHandler) {
    udfStopHandler = stopHandler;
}

//////////////////////////////////////////////////////////////////////////////
//                                                                          //
// Register a user-defined track change handler function                    //
//                                                                          //
// This function will be called whenever the player changes to a new track  //
//                                                                          //
// The user-defined function must accept a single argument, which           //
// corresponds to the new playlist index when the track is changed          //
//                                                                          //
// No return value is required, or used                                     //
//                                                                          //
//////////////////////////////////////////////////////////////////////////////

function registerTrackChangeHandler(trackChangeHandler) {
    udfTrackChangeHandler = trackChangeHandler;
}

//////////////////////////////////////////////////////////////////////////////
// PRIVATE FUNCTIONS                                                        //
//////////////////////////////////////////////////////////////////////////////

// run the provided function reference in a try block,
// and log any errors to the console
function handleUdfNoArgFunction(functionRef) {
    if (null != functionRef) {
        try {
            functionRef();
        } catch (error) {
            console.error(error);
        }
    }
}

// call the user-defined play handler function (if we have one)
function handleUdfPlay() {
    handleUdfNoArgFunction(udfPlayHandler);
}

// call the user-defined pause handler function (if we have one)
function handleUdfPause() {
    handleUdfNoArgFunction(udfPauseHandler);
}

// call the user-defined stop handler function (if we have one)
function handleUdfStop() {
    handleUdfNoArgFunction(udfStopHandler);
}

// call the user-defined track change handler function (if we have one)
function handleUdfTrackChange(playlistIndex) {
    // if we have a user-defined track change handler function
    if (null != udfTrackChangeHandler) {
        // if the track has changed since the last time we called it
        if (playlistIndex != udfPrevTrackChangeHandlerIndex) {
            // call the user-defined function
            // with the current playlist index
            try {
                udfTrackChangeHandler(playlistIndex);
            } catch (error) {
                console.error(error);
            }
        }

        // remember which playlist index we called the function with
        // for next time
        udfPrevTrackChangeHandlerIndex = playlistIndex;
    }
}

// enable the playStateIntervalHandler interval timer
function setPlayStateIntervalHandler() {
    setInterval(playStateIntervalHandler, 100);
}

// playStateIntervalHandler
//
// Intended to be run frequently from a JavaScript interval timer,
// once the the audio player starts playing
//
// It also has to continue running after the audio player has started,
// because outside forces like the iPhone media controls on the lock
// screen can also control the audio playback outside of our API
//
// Handles switching to the next track after the end of the current track,
// updating UI elements, etc.
function playStateIntervalHandler() {
    // if the audio player is supposed to be playing
    if (playing) {
        // if the current audio track just ended
        if (audio.ended) {
            // if we weren't already on the last track
            if (playlistIndex < (playlist.length - 1)) {
                // go to the next track
                nextTrack();

            // we were on the last track, and it just ended
            } else {
                // pause the audio player
                pause();

                // go back to the first track, but don't start playback
                playlistIndex = 0;
                audio.src = playlist[playlistIndex]["url"];

                // clear deferred variables from previous playlist
                deferredAudioSrc = null;
                deferredInitialSeekTime = null;

                // reset playback position
                uiSetPlaybackPosition(0);

                // update the track skip buttons,
                // if we've landed at either end of the playlist
                uiUpdateTrackSkipButtons();

                // call user-defined function
                handleUdfTrackChange(playlistIndex);
            }

        // if playback was paused outside of our API
        // (e.g. from an iPhone controller on the lock screen)
        } else if (audio.paused) {
            // reflect reality
            pause();
        }

        // update the elapsed/remaining/duration time counter
        // HTML display elements
        uiUpdateStatus();

    // if the audio player is not supposed to be playing
    } else {
        // but it's actually playing
        if (! audio.paused) {
            // reflect reality
            play();
        }
    }
}

//////////////////////////////////////////////////////////////////////////////
// HTML/CSS USER INTERFACE SECTION                                          //
//                                                                          //
// Everything in this section is related to the specifics of updating the   //
// basic UI HTML/CSS interface elements for the audio player.               //
//                                                                          //
// These functions are called from other parts of the program, but will     //
// only have an effect if the basic user interface HTML elements with       //
// specific IDs are present.                                                //
//////////////////////////////////////////////////////////////////////////////

// preload any of the navigation control images that are actually referenced
// on the HTML page. this is an optimization, but also makes the player UI
// more resilient when the user has intermittent connectivity, as we can
// at least keep the state of the UI in sync with reality
function uiPreloadImages() {
    if (null == uiBaseImageUrl) {
        return;
    }

    // play/pause button
    const playPauseButtonImg =
        document.getElementById(UI_PLAY_PAUSE_BUTTON_ID);
    if (null != playPauseButtonImg) {
        const playButtonImage = new Image();
        playButtonImage.src = uiBaseImageUrl + UI_PLAY_IMG;
        uiPreloadImageCache[UI_PLAY_IMG] = playButtonImage;

        const pauseButtonImage = new Image();
        pauseButtonImage.src = uiBaseImageUrl + UI_PAUSE_IMG;
        uiPreloadImageCache[UI_PAUSE_IMG] = pauseButtonImage;
    }

    // prev button
    const prevTrackButtonImg = document.getElementById(UI_PREV_TRACK_IMG_ID);
    if (null != prevTrackButtonImg) {
        const prevImage = new Image();
        prevImage.src = uiBaseImageUrl + UI_PREV_IMG;
        uiPreloadImageCache[UI_PREV_IMG] = prevImage;

        const prevDisabledImage = new Image();
        prevDisabledImage.src = uiBaseImageUrl + UI_PREV_DISABLED_IMG;
        uiPreloadImageCache[UI_PREV_DISABLED_IMG] = prevDisabledImage;
    }

    // next button
    const nextTrackButtonImg = document.getElementById(UI_NEXT_TRACK_IMG_ID);
    if (null != nextTrackButtonImg) {
        const nextImage = new Image();
        nextImage.src = uiBaseImageUrl + UI_NEXT_IMG;
        uiPreloadImageCache[UI_NEXT_IMG] = nextImage;

        const nextDisabledImage = new Image();
        nextDisabledImage.src = uiBaseImageUrl + UI_NEXT_DISABLED_IMG;
        uiPreloadImageCache[UI_NEXT_DISABLED_IMG] = nextDisabledImage;
    }
}

// updates the play/pause button based on the current audio playback state
function uiUpdatePlayPauseButton() {
    // if we don't have a base image URL, we can't load images
    if (null == uiBaseImageUrl) {
        return;
    }

    // this toggle follows the standard convention, where the symbol on
    // the button at any moment shows what will happen if you press the
    // button (which is the opposite of the current state)
    //
    // when the player is playing, the pause symbol will be displayed
    // when the player is paused, the play symbol will be displayed

    const playPauseButtonImg =
        document.getElementById(UI_PLAY_PAUSE_BUTTON_ID);
    if (null != playPauseButtonImg) {
        // the player is playing
        if (playing) {
            // if we're not sure if the pause symbol is currently displayed
            // show the pause symbol
            playPauseButtonImg.src = uiBaseImageUrl + UI_PAUSE_IMG;

        // the player is paused
        } else {
            // if we're not sure if the play symbol is currently displayed
            // show the play symbol
            playPauseButtonImg.src = uiBaseImageUrl + UI_PLAY_IMG;
        }
    }
}

// calculates elapsed/remaining time based on current audio playback,
// and updates HTML UI elements to match
function uiUpdateStatus() {
    // if the user is not currently moving the time slider around,
    // update the elapsed/remaining time counter HTML display elements
    //
    // we round both times to integers here, so that the
    // elapsed/remaining times change simultaneously in the display
    if (! uiUserIsAdjustingTimeSlider) {
        const intDuration = Math.round(audio.duration || 0);

        // use the deferred seek time if one is set,
        // otherwise use the actual current time
        const intCurrentTime =
            (null != deferredInitialSeekTime) ?
            deferredInitialSeekTime :
            Math.round(audio.currentTime);

        const intRemaining = (intDuration * -1) + intCurrentTime;

        uiUpdateTimeDisplay(
            secondsToDisplayTime(intCurrentTime),
            secondsToDisplayTime(intRemaining),
            secondsToDisplayTime(intDuration)
        );
    }
}

// updates the elapsed/remaining time counter HTML display elements
// accepts elapsed/remaining time strings that will be displayed
// without modification
function uiUpdateTimeDisplay(elapsed, remaining, duration) {
    const elapsedElement = document.getElementById(UI_TIME_ELAPSED_ID);
    const remainingElement = document.getElementById(UI_TIME_REMAINING_ID);
    const durationElement = document.getElementById(UI_TIME_DURATION_ID);

    if (null != elapsedElement) {
        elapsedElement.innerHTML = elapsed;
    }

    if (null != remainingElement) {
        remainingElement.innerHTML = remaining;
    }

    if (null != durationElement) {
        durationElement.innerHTML = duration;
    }
}

// update the prev/next track skip button HTML UI elements
//
// disables the prev track button when the player is on the first track,
// and disables the next track button when the player is on the last track
function uiUpdateTrackSkipButtons() {
    const prevTrackLink = document.getElementById(UI_PREV_TRACK_LINK_ID);
    const nextTrackLink = document.getElementById(UI_NEXT_TRACK_LINK_ID);

    const prevTrackImg = document.getElementById(UI_PREV_TRACK_IMG_ID);
    const nextTrackImg = document.getElementById(UI_NEXT_TRACK_IMG_ID);

    // if we're on the first track, disable the prev track button
    if (0 == playlistIndex) {
        if (null != prevTrackLink) {
            prevTrackLink.style["pointer-events"] = "none";
        }
        if (null != prevTrackImg) {
            if (null != uiBaseImageUrl) {
                prevTrackImg.src = uiBaseImageUrl + UI_PREV_DISABLED_IMG;
            }
        }

    // if we're not on the first track, enable the prev track button
    } else {
        if (null != prevTrackLink) {
            prevTrackLink.style["pointer-events"] = "auto";
        }
        if (null != prevTrackImg) {
            if (null != uiBaseImageUrl) {
                prevTrackImg.src = uiBaseImageUrl + UI_PREV_IMG;
            }
        }
    }

    // if we're on the last track, disable the next track button
    if (playlistIndex >= (playlist.length - 1)) {
        if (null != nextTrackLink) {
            nextTrackLink.style["pointer-events"] = "none";
        }
        if (null != nextTrackImg) {
            if (null != uiBaseImageUrl) {
                nextTrackImg.src = uiBaseImageUrl + UI_NEXT_DISABLED_IMG;
            }
        }

    // if we're not on the last track, enable the next track button
    } else {
        if (null != nextTrackLink) {
            nextTrackLink.style["pointer-events"] = "auto";
        }
        if (null != nextTrackImg) {
            if (null != uiBaseImageUrl) {
                nextTrackImg.src = uiBaseImageUrl + UI_NEXT_IMG;
            }
        }
    }
}

// manually set the playback position on the slider bar
// accepts a percentage from 0-100
function uiSetPlaybackPosition(percent) {
    const playbackPosition = document.getElementById(UI_PLAYBACK_POSITION_ID);
    if (null != playbackPosition) {
        playbackPosition.value = percent;
    }
}

// add bidirectional event listeners to link up the Audio playback object
// with the playback position slider HTML element and time status fields
function uiAddEventListeners() {
    // get a reference to the slider navigation bar
    const playbackPosition = document.getElementById(UI_PLAYBACK_POSITION_ID);

    // get a reference to the play/pause button
    const playPauseButtonImg =
        document.getElementById(UI_PLAY_PAUSE_BUTTON_ID);

    //
    // AUDIO EVENT LISTENERS
    //

    // when an audio track ends
    //
    // this listener does not depend on any UI elements, and is always added
    // the purpose of this event listener is to quickly forward to the
    // next track in the playlist as soon as the previous track ends
    audio.addEventListener("ended", () => {
        // the playStateIntervalHandler should already be running in an
        // interval timer, but by calling it again right at this moment,
        // we can respond to this event with lower latency
        playStateIntervalHandler();
    });

    // when an audio track loads enough to read the metadata
    //
    // this listener is only added if we have at least one of the playback
    // position slider or the play/pause button
    if ((null != playbackPosition) || (null != playPauseButtonImg)) {
        audio.addEventListener("loadedmetadata", () => {
            // reset UI playback position
            uiSetPlaybackPosition(0);

            // update the UI status
            uiUpdateStatus();
        });
    }

    // when an audio track is playing, update the slider navigation bar,
    // unless the user is in the middle of adjusting it
    //
    // this listener is only added if we have the playback position slider
    if (null != playbackPosition) {
        audio.addEventListener("timeupdate", () => {
            if (! uiUserIsAdjustingTimeSlider) {
                if (audio.duration > 0) {
                    playbackPosition.value =
                        audio.currentTime / audio.duration * 100;
                } else {
                    playbackPosition.value = 0;
                }
            }
        });
    }

    //
    // PLAYBACK POSITION SLIDER EVENT LISTENERS
    //

    // every event listener in this block is set up on the playback position
    // slider UI element, but only if it is present
    if (null != playbackPosition) {
        // when the user changes the position of the slider navigation bar,
        // seek to the time they selected
        playbackPosition.addEventListener("change", () => {
            // calculate the percentage from the slider bar position
            const percent = playbackPosition.value / 100;

            // calculate the seconds for the current audio track,
            // by percentage
            const seconds = (audio.duration || 0) * percent;

            // seek to the requested part of the audio track
            seek(seconds, false);
        });

        // when the user is dragging the slider navigation bar,
        // remember that so the audio player doesn't also try to update it
        // while it's playing
        playbackPosition.addEventListener("pointerdown", () => {
            uiUserIsAdjustingTimeSlider = true;
        });

        // when the user stops dragging the slider navigation bar,
        // set things back to normal
        playbackPosition.addEventListener("pointerup", () => {
            uiUserIsAdjustingTimeSlider = false;
        });

        // if the user is dragging the slider navigation bar around,
        // update the elapsed/remaining time displays as they drag it around
        //
        // we round the elapsed/remaining times together here,
        // so that they move in sync with each other as whole seconds
        playbackPosition.addEventListener("input", () => {
            // calculate the percentage from the slider bar position
            const percent = playbackPosition.value / 100;

            // calculate duration
            const intDuration = Math.round(audio.duration || 0);

            // calculate the seconds for the current audio track,
            // by percentage
            const intSeconds = Math.round(intDuration * percent);

            // calculate remaining time for the current track,
            // based on current position
            const remaining = (intDuration * -1) + intSeconds;

            // update the elapsed/remaining time displays
            uiUpdateTimeDisplay(
                secondsToDisplayTime(intSeconds),
                secondsToDisplayTime(remaining),
                secondsToDisplayTime(intDuration)
            );
        });
    }
}

//////////////////////////////////////////////////////////////////////////////
// NAMESPACE EXPORTS                                                        //
//////////////////////////////////////////////////////////////////////////////

diyaudioplayer.init                       = init;
diyaudioplayer.loadPlaylist               = loadPlaylist;
diyaudioplayer.setBaseImageUrl            = setBaseImageUrl;
diyaudioplayer.play                       = play;
diyaudioplayer.stop                       = stop;
diyaudioplayer.pause                      = pause;
diyaudioplayer.playPause                  = playPause;
diyaudioplayer.isPlaying                  = isPlaying;
diyaudioplayer.seek                       = seek;
diyaudioplayer.prevTrack                  = prevTrack;
diyaudioplayer.nextTrack                  = nextTrack;
diyaudioplayer.playTrack                  = playTrack;
diyaudioplayer.getCurrentPlaylistIndex    = getCurrentPlaylistIndex;
diyaudioplayer.secondsToDisplayTime       = secondsToDisplayTime;
diyaudioplayer.setNoTimeDisplay           = setNoTimeDisplay;
diyaudioplayer.enableDisplayTimeZeroPad   = enableDisplayTimeZeroPad;
diyaudioplayer.getAudio                   = getAudio;
diyaudioplayer.registerPlayHandler        = registerPlayHandler;
diyaudioplayer.registerPauseHandler       = registerPauseHandler;
diyaudioplayer.registerStopHandler        = registerStopHandler;
diyaudioplayer.registerTrackChangeHandler = registerTrackChangeHandler;

// END NAMESPACE
}

