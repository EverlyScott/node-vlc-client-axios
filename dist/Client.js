"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const Types_1 = require("./Types");
const phin = require("phin");
const querystring_1 = require("querystring");
class Client {
    constructor(options) {
        this.options = Client.validateOptions(options);
    }
    //region ACTIONS
    play() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.sendCommand("pl_forceresume");
        });
    }
    pause() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.sendCommand("pl_forcepause");
        });
    }
    togglePlay() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.sendCommand("pl_pause");
        });
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.sendCommand("pl_stop");
        });
    }
    next() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.sendCommand("pl_next");
        });
    }
    previous() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.sendCommand("pl_previous");
        });
    }
    emptyPlaylist() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.sendCommand("pl_empty");
        });
    }
    removeFromPlaylist(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.sendCommand("pl_delete", { id });
        });
    }
    jumpForward(seconds) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.sendCommand("seek", {
                val: `+${seconds}`
            });
        });
    }
    jumpBackwards(seconds) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.sendCommand("seek", {
                val: `-${seconds}`
            });
        });
    }
    toggleFullscreen() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.sendCommand("fullscreen");
        });
    }
    /**
     * Increase the volume 0-100
     * @param increaseBy: int
     */
    increaseVolume(increaseBy) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.sendCommand("seek", {
                val: `+${Math.floor(increaseBy * 5.12)}`
            });
        });
    }
    /**
     * Decrease the volume 0-100
     * @param decreaseBy: int
     */
    decreaseVolume(decreaseBy) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.sendCommand("seek", {
                val: `-${Math.floor(decreaseBy * 5.12)}`
            });
        });
    }
    //endregion
    //region GETTERS
    /**
     * Returns an object with all the info that VLC provides except playlist info
     */
    status() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.makeRequest();
        });
    }
    isPlaying() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.getPlaybackState()) === "playing";
        });
    }
    isPaused() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.getPlaybackState()) === "paused";
        });
    }
    isStopped() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.getPlaybackState()) === "stopped";
        });
    }
    isFullscreen() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.status()).fullscreen;
        });
    }
    /**
     * State of vlc ( playing / paused / stop );
     */
    getPlaybackState() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.status()).state;
        });
    }
    /**
     * Time of playback in seconds
     */
    getTime() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.status()).time;
        });
    }
    /**
     * Media progress from 0-100
     */
    getProgress() {
        return __awaiter(this, void 0, void 0, function* () {
            return ((yield this.getTime()) / (yield this.getLength())) * 100;
        });
    }
    /**
     * Length of the current media playing in seconds
     */
    getLength() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.status()).length;
        });
    }
    /**
     * Get the volume in a 0-100 range
     */
    getVolume() {
        return __awaiter(this, void 0, void 0, function* () {
            return ((yield this.status()).volume / 512) * 100;
        });
    }
    /**
     * Get the current volume as VLC represents it
     * from 0-512, where 256 is 100% and 512 is 200%
     */
    getVolumeRaw() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.status()).volume;
        });
    }
    /**
     * Audio delay from video stream in seconds
     */
    getAudioDelay() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.status()).audiodelay;
        });
    }
    /**
     * Subtitle delay from video stream in seconds
     */
    getSubtitleDelay() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.status()).subtitledelay;
        });
    }
    /**
     * Returns an array of PlaylistEntries
     */
    getPlaylist() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.requestPlaylist();
        });
    }
    getAspectRatio() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.status()).aspectratio;
        });
    }
    getSubtitleTracks() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.getTracks()).subtitle;
        });
    }
    getAudioTracks() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.getTracks()).audio;
        });
    }
    getVideoTracks() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.getTracks()).video;
        });
    }
    /**
     * Get all tracks (video,audio,subs)
     */
    getTracks() {
        return __awaiter(this, void 0, void 0, function* () {
            const stats = yield this.status();
            let tracks = {
                audio: [],
                video: [],
                subtitle: [],
            };
            for (let key of Object.keys(stats.information.category)) {
                if (key.substring(0, 6) === "Stream") {
                    let streamIndex = Number.parseInt(key.substring(7));
                    if (!isNaN(streamIndex)) {
                        let track = stats.information.category[key];
                        track.streamIndex = streamIndex;
                        switch (track.Type) {
                            case "Audio":
                                tracks.audio.push(track);
                                break;
                            case "Video":
                                tracks.video.push(track);
                                break;
                            case "Subtitle":
                                tracks.subtitle.push(track);
                                break;
                        }
                    }
                }
            }
            return tracks;
        });
    }
    /**
     * Returns an array with all the available aspect ratios
     */
    availableAspectRations() {
        return Object.values(Types_1.AspectRatio);
    }
    //endregion
    //region SETTERS
    /**
     * Set time of playback in seconds
     */
    setTime(time) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.sendCommand("seek", {
                val: Math.floor(time),
            });
        });
    }
    /**
     * Set progress of media playback 0-100 range
     * @param progress: float
     */
    setProgress(progress) {
        return __awaiter(this, void 0, void 0, function* () {
            if (progress < 0 || progress > 100)
                return;
            yield this.sendCommand("seek", {
                val: `${progress}%`,
            });
        });
    }
    /**
     * Set volume from 0-100
     * @param volume:Int
     */
    setVolume(volume) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.sendCommand("volume", {
                val: Math.floor(512 * volume / 100)
            });
        });
    }
    /**
     * Set volume as VLC represents it 0-512
     * @param volume:Int
     */
    setVolumeRaw(volume) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.sendCommand("volume", {
                val: Math.floor(volume),
            });
        });
    }
    setFullscreen(val) {
        return __awaiter(this, void 0, void 0, function* () {
            if ((yield this.isFullscreen()) != val) {
                yield this.toggleFullscreen();
            }
        });
    }
    setAspectRation(ar) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!Object.values(Types_1.AspectRatio).includes(ar)) {
                return;
            }
            yield this.sendCommand("aspectratio", {
                val: ar
            });
        });
    }
    //endregion
    //region REQUESTS
    sendCommand(command, params) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.makeRequest(Object.assign({ command }, params));
        });
    }
    makeRequest(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const auth = `${this.options.username}:${this.options.password}`;
            const headers = {
                "Authorization": `Basic ${Buffer.from(auth).toString("base64")}`,
            };
            if (data) {
                headers["Content-Type"] = "application/x-www-form-urlencoded";
            }
            let url = `http://${this.options.ip}:${this.options.port}/requests/status.json`;
            if (data) {
                url += `?${querystring_1.stringify(data)}`;
            }
            console.log(url);
            const response = yield phin({
                url,
                method: "GET",
                headers,
                data,
            });
            console.log(response.url, response.statusMessage, response.statusCode);
            if (response.complete && response.statusCode === 200) {
                // console.log(response.body.toString());
                // return xml.parse(response.body.toString()).root;
                return JSON.parse(response.body.toString());
            }
            else {
                throw new Error(`Request error | Code ${response.statusCode} | Message ${response.statusMessage}`);
            }
        });
    }
    requestPlaylist() {
        return __awaiter(this, void 0, void 0, function* () {
            const auth = `${this.options.username}:${this.options.password}`;
            const headers = {
                "Authorization": `Basic ${Buffer.from(auth).toString("base64")}`,
            };
            let url = `http://${this.options.ip}:${this.options.port}/requests/playlist.json`;
            console.log(url);
            const response = yield phin({
                url,
                method: "GET",
                headers,
            });
            console.log(response.url, response.statusMessage, response.statusCode);
            if (response.complete && response.statusCode === 200) {
                return Client.parsePlaylistEntries(response.body);
            }
            else {
                throw new Error(`Request error | Code ${response.statusCode} | Message ${response.statusMessage}`);
            }
        });
    }
    //endregion
    //region HELPERS
    static parsePlaylistEntries(buffer) {
        const playlistResponse = JSON.parse(buffer.toString());
        return playlistResponse.children
            .find(c => c.name === "Playlist")
            .children
            .map(pe => ({
            id: pe.id,
            name: pe.name,
            duration: pe.duration,
            isCurrent: (pe.current === "current"),
            uri: querystring_1.unescape(pe.uri),
        }));
    }
    static validateOptions(options) {
        if (typeof options.ip !== "string") {
            throw new Error("IP is required and should be a string");
        }
        if (typeof options.port !== "number") {
            throw new Error("Port is required and should be a number");
        }
        if (options.username !== undefined && options.username !== null && (typeof options.username !== "string")) {
            throw new Error("Username should be a string");
        }
        else {
            options.username = "";
        }
        if (typeof options.password !== "string") {
            throw new Error("Password is required and should be a string");
        }
        return options;
    }
}
exports.default = Client;
//# sourceMappingURL=Client.js.map