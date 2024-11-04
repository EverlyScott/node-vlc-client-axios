import {
  AlbumArtResult,
  AspectRatio,
  AudioTrack,
  BrowseResponse,
  ClientOptions,
  PlayFileOptions,
  PlaylistEntry,
  SubtitleTrack,
  Track,
  Tracks,
  VideoTrack,
  VlcFile,
  VlcMeta,
  VlcStatus,
} from "./Types";
import axios, { AxiosHeaderValue } from "axios";
import { basename, normalize } from "path-browserify";
import VlcClientError from "./VlcClientError";

export default class Client {
  private readonly options: ClientOptions;

  public constructor(options: ClientOptions) {
    this.options = Client.validateOptions(options);
  }

  //region ACTIONS
  public async play() {
    await this.sendCommand("pl_forceresume");
  }

  public async pause() {
    await this.sendCommand("pl_forcepause");
  }

  public async togglePlay() {
    await this.sendCommand("pl_pause");
  }

  public async stop() {
    await this.sendCommand("pl_stop");
  }

  public async next() {
    await this.sendCommand("pl_next");
  }

  public async previous() {
    await this.sendCommand("pl_previous");
  }

  public async emptyPlaylist() {
    await this.sendCommand("pl_empty");
  }

  public async removeFromPlaylist(id: number) {
    await this.sendCommand("pl_delete", { id });
  }

  public async playFromPlaylist(entryId: number) {
    await this.sendCommand("pl_play", {
      id: entryId,
    });
  }

  public async addToPlaylist(uri: string) {
    await this.sendCommand("in_enqueue", {
      input: uri,
    });
  }

  /**
   * Browse the remote computer running the VLC instance
   * for files in a given directory
   * @param dir The directory to browse
   */
  public async browse(dir: string = "/"): Promise<VlcFile[]> {
    return this.requestBrowse(dir);
  }

  /**
   * Play a file by specifing URI. Adds a
   * file to the playlist and plays it imediately.
   * Only one of the noaudio/novideo options can
   * be set.
   * @param options.wait Wait for vlc to open the file
   * @param options.timeout Time to wait for vlc to open the file
   */
  public async playFile(uri: string, options?: PlayFileOptions) {
    const params: any = {
      input: uri,
    };
    if (options?.noaudio) {
      params.option = "noaudio";
    } else if (options?.novideo) {
      params.option = "novideo";
    }
    await this.sendCommand("in_play", params);
    if (options?.wait) {
      const startTime = Date.now();
      const timeout = options?.timeout ?? 3000;
      const fileName = basename(uri);
      return new Promise<void>((res) => {
        let interval = setInterval(async () => {
          if (Date.now() - startTime > timeout) {
            clearInterval(interval);
            res();
          }
          if ((await this.getFileName()) === fileName) {
            clearInterval(interval);
            res();
          }
        }, 250);
      });
    }
  }

  public async jumpForward(seconds: number) {
    await this.sendCommand("seek", {
      val: `+${seconds}`,
    });
  }

  public async jumpBackwards(seconds: number) {
    await this.sendCommand("seek", {
      val: `-${seconds}`,
    });
  }

  public async toggleFullscreen() {
    await this.sendCommand("fullscreen");
  }

  /**
   * Increase the volume 0-100
   * @param increaseBy: int
   */
  public async increaseVolume(increaseBy: number) {
    await this.sendCommand("volume", {
      val: `+${Math.floor(increaseBy * 5.12)}`,
    });
  }

  /**
   * Decrease the volume 0-100
   * @param decreaseBy: int
   */
  public async decreaseVolume(decreaseBy: number) {
    await this.sendCommand("volume", {
      val: `-${Math.floor(decreaseBy * 5.12)}`,
    });
  }

  //endregion

  //region GETTERS
  /**
   * Returns an object with all the info that VLC provides except playlist info
   */
  public async status(): Promise<VlcStatus> {
    return this.requestStatus();
  }

  public async meta(): Promise<VlcMeta> {
    return (await this.status())?.information?.category?.meta;
  }

  public async getFileName(): Promise<string> {
    return (await this.status())?.information?.category?.meta?.filename;
  }

  public async isPlaying(): Promise<boolean> {
    return (await this.getPlaybackState()) === "playing";
  }

  public async isPaused(): Promise<boolean> {
    return (await this.getPlaybackState()) === "paused";
  }

  public async isStopped(): Promise<boolean> {
    return (await this.getPlaybackState()) === "stopped";
  }

  public async isFullscreen(): Promise<boolean> {
    return (await this.status()).fullscreen;
  }

  /**
   * State of vlc ( playing / paused / stop )
   */
  public async getPlaybackState(): Promise<string> {
    return (await this.status()).state;
  }

  /**
   * Time of playback in seconds
   */
  public async getTime(): Promise<number> {
    return (await this.status()).time;
  }

  /**
   * Media progress from 0-100
   */
  public async getProgress(): Promise<number> {
    return ((await this.getTime()) / (await this.getLength())) * 100;
  }

  /**
   * Length of the current media playing in seconds
   */
  public async getLength(): Promise<number> {
    return (await this.status()).length;
  }

  /**
   * Get the volume in a 0-100 range
   */
  public async getVolume(): Promise<number> {
    return Math.floor(((await this.status()).volume / 512) * 100);
  }

  /**
   * Get the current volume as VLC represents it
   * from 0-512, where 256 is 100% and 512 is 200%
   */
  public async getVolumeRaw(): Promise<number> {
    return (await this.status()).volume;
  }

  /**
   * Audio delay from video stream in seconds
   */
  public async getAudioDelay(): Promise<number> {
    return (await this.status()).audiodelay;
  }

  /**
   * Subtitle delay from video stream in seconds
   */
  public async getSubtitleDelay(): Promise<number> {
    return (await this.status()).subtitledelay;
  }

  /**
   * Returns an array of PlaylistEntries
   */
  public async getPlaylist(): Promise<PlaylistEntry[]> {
    return this.requestPlaylist();
  }

  public async getAspectRatio(): Promise<string> {
    return (await this.status()).aspectratio;
  }

  public async getSubtitleTracks(): Promise<SubtitleTrack[]> {
    return (await this.getTracks()).subtitle;
  }

  public async getAudioTracks(): Promise<AudioTrack[]> {
    return (await this.getTracks()).audio;
  }

  public async getVideoTracks(): Promise<VideoTrack[]> {
    return (await this.getTracks()).video;
  }

  public async getChapters(): Promise<number[]> {
    return (await this.status()).information.chapters;
  }

  public async getCurrentChapter(): Promise<number> {
    return (await this.status()).information.chapter;
  }

  public async isLooping(): Promise<boolean> {
    return (await this.status()).loop;
  }

  public async isRandom(): Promise<boolean> {
    return (await this.status()).random;
  }

  public async isRepeating(): Promise<boolean> {
    return (await this.status()).repeat;
  }

  /**
   * Playback rate. Normal speed is 1. Range 0.25 - 4
   */
  public async getPlaybackRate(): Promise<number> {
    return (await this.status()).rate;
  }

  public async getAlbumArt(playlistEntryId?: number): Promise<AlbumArtResult> {
    return await this.requestAlbumArt(playlistEntryId);
  }

  /**
   * Get all tracks (video,audio,subs)
   */
  public async getTracks(): Promise<Tracks> {
    const stats = await this.status();

    let tracks: Tracks = {
      audio: [],
      video: [],
      subtitle: [],
    };
    for (let key of Object.keys(stats.information.category)) {
      if (key.substring(0, 6) === "Stream") {
        let streamIndex = Number.parseInt(key.substring(7));
        if (!isNaN(streamIndex)) {
          let track = stats.information.category[key] as Track;
          track.streamIndex = streamIndex;
          switch (track.Type) {
            case "Audio":
              tracks.audio.push(<AudioTrack>track);
              break;
            case "Video":
              tracks.video.push(<VideoTrack>track);
              break;
            case "Subtitle":
              tracks.subtitle.push(<SubtitleTrack>track);
              break;
          }
        }
      }
    }

    return tracks;
  }

  /**
   * Returns an array with all the available aspect ratios
   */
  public availableAspectRations(): string[] {
    return Object.values(AspectRatio);
  }

  //endregion

  //region SETTERS

  /**
   * Set time of playback in seconds
   */
  public async setTime(time: number) {
    await this.sendCommand("seek", {
      val: Math.floor(time),
    });
  }

  /**
   * Set progress of media playback 0-100 range
   * @param progress: float
   */
  public async setProgress(progress: number) {
    if (progress < 0 || progress > 100) return;

    await this.sendCommand("seek", {
      val: `${progress}%`,
    });
  }

  /**
   * Set volume from 0-100
   * @param volume:Int
   */
  public async setVolume(volume: number) {
    await this.sendCommand("volume", {
      val: Math.floor((512 * volume) / 100),
    });
  }

  /**
   * Set volume as VLC represents it 0-512
   * @param volume:Int
   */
  public async setVolumeRaw(volume: number) {
    await this.sendCommand("volume", {
      val: Math.floor(volume),
    });
  }

  public async setFullscreen(val: boolean) {
    if ((await this.isFullscreen()) != val) {
      await this.toggleFullscreen();
    }
  }

  public async setAspectRation(ar: AspectRatio) {
    if (!Object.values(AspectRatio).includes(ar)) {
      return;
    }
    await this.sendCommand("aspectratio", {
      val: ar,
    });
  }

  public async setRepeating(shouldRepeat: boolean) {
    if ((await this.isRepeating()) !== shouldRepeat) {
      await this.sendCommand("pl_repeat");
    }
  }

  public async setLooping(shouldLoop: boolean) {
    if ((await this.isLooping()) !== shouldLoop) {
      await this.sendCommand("pl_loop");
    }
  }

  public async setRandom(random: boolean) {
    if ((await this.isRandom()) !== random) {
      await this.sendCommand("pl_random");
    }
  }

  /**
   * Playback rate. Normal speed is 1. Range 0.25 - 4
   */
  public async setPlaybackRate(rate: number) {
    await this.sendCommand("rate", { val: rate });
  }

  public async setSubtitleDelay(delay: number) {
    await this.sendCommand("subdelay", { val: delay });
  }

  public async setAudioDelay(delay: number) {
    await this.sendCommand("audiodelay", { val: delay });
  }

  public async setChapter(chapter: number) {
    await this.sendCommand("chapter", { val: chapter });
  }

  /**
   * Select the audio track. Get the audio track id from .streams()
   */
  public async setAudioTrack(trackId: number) {
    await this.sendCommand("audio_track", { val: trackId });
  }

  public async setSubtitleTrack(trackId: number) {
    await this.sendCommand("subtitle_track", { val: trackId });
  }

  public async setVideoTrack(trackId: number) {
    await this.sendCommand("video_track", { val: trackId });
  }

  //endregion

  //region REQUESTS
  private async sendCommand(command: string, params?: any) {
    return this.requestStatus({
      command,
      ...params,
    });
  }

  private async requestStatus(data?: any): Promise<VlcStatus> {
    let response = await this.request("/requests/status.json", data);
    const body = new TextDecoder().decode(response.body);
    return JSON.parse(body);
  }

  private async requestPlaylist(): Promise<PlaylistEntry[]> {
    const response = await this.request("/requests/playlist.json");
    return Client.parsePlaylistEntries(response.body as unknown as ArrayBuffer);
  }

  private async requestBrowse(dir: string): Promise<VlcFile[]> {
    const response = await this.request("/requests/browse.json", { dir });

    const body = new TextDecoder().decode(response.body);
    const browseResult = <BrowseResponse>JSON.parse(body);

    if (Array.isArray(browseResult?.element)) {
      let files = browseResult.element.filter((e) => e.name && e.name !== "..");
      files.forEach((e) => (e.path = normalize(e.path)));
      return files;
    } else {
      const body = new TextDecoder().decode(response.body);
      throw new VlcClientError(`Unexpected response: ${body}`);
    }
  }

  private async requestAlbumArt(playlistEntryId: number): Promise<AlbumArtResult> {
    let query;
    if (playlistEntryId) {
      query = {
        item: playlistEntryId,
      };
    }

    const response = await this.request("/art", query);

    return {
      contentType: (response.headers["Content-Type"] || response.headers["content-type"]) as string,
      buffer: response.body,
    };
  }

  private async request(
    urlPath: string,
    query?: any
  ): Promise<{
    body: ArrayBuffer;
    headers: { [key: string]: AxiosHeaderValue };
    complete: boolean;
    statusCode: number;
    statusMessage: string;
  }> {
    const auth = `${this.options.username}:${this.options.password}`;

    const headers = {
      Authorization: `Basic ${btoa(auth)}`,
    };

    let url = `http://${this.options.ip}:${this.options.port}${urlPath}`;

    const serialize = (obj: { [key: string]: string }) => {
      const str = [];
      for (const p in obj)
        if (obj.hasOwnProperty(p)) {
          str.push(`${encodeURIComponent(p)}=${encodeURIComponent(obj[p])}`);
        }
      return str.join("&");
    };

    if (query) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      url += `?${serialize(query)}`;
    }

    // this.log(url);

    const response = await axios.get(url, {
      headers,
      responseType: "arraybuffer",
    });

    // this.log(response.body.toString());

    if (response.status === 200 && typeof response.headers.toJSON === "function") {
      return {
        body: response.data,
        headers: response.headers.toJSON(true),
        complete: true,
        statusCode: response.status,
        statusMessage: response.statusText,
      };
    } else {
      throw new Error(`Request error | Code ${response.status} | Message ${response.statusText}`);
    }
  }
  //endregion

  //region HELPERS

  private log(...args: any[]) {
    if (this.options.log === true) {
      console.error(...args);
    }
  }

  private error(...args: any[]) {
    if (this.options.log === true) {
      console.error(...args);
    }
  }

  private static parsePlaylistEntries(buffer: ArrayBuffer): PlaylistEntry[] {
    const text = new TextDecoder().decode(buffer);
    const playlistResponse = JSON.parse(text);

    return playlistResponse.children
      .find((c) => c.name === "Playlist")
      .children.map((pe) => ({
        id: pe.id,
        name: pe.name,
        duration: pe.duration,
        isCurrent: pe.current === "current",
        uri: unescape(pe.uri),
      }));
  }

  private static validateOptions(options: ClientOptions): ClientOptions {
    if (typeof options.ip !== "string") {
      throw new Error("IP is required and should be a string");
    }
    if (typeof options.port !== "number") {
      throw new Error("Port is required and should be a number");
    }
    if (options.username !== undefined && options.username !== null && typeof options.username !== "string") {
      throw new Error("Username should be a string");
    } else {
      options.username = "";
    }
    if (typeof options.password !== "string") {
      throw new Error("Password is required and should be a string");
    }
    options.log = options.log === true;

    return options;
  }

  //endregion
}
