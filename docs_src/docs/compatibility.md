# Compatibility

| System   | Platform   | Chrom(ium) | Firefox (Nightly) | Safari | Edge | Samsung Internet | Carmel |
| -------- | ---------- | ---------- | ----------------- | ------ | ---- | ---------------- | ------ |
| Windows  | Desktop    | **YES**    | **YES**           | n/a    | ?    | n/a              | n/a    |
|          | Vive       | **YES**    | **YES**           | n/a    | No   | n/a              | n/a    |
|          | Rift+Touch | **YES**    | NO                | n/a    | No   | n/a              | n/a    |
| Mac      | Desktop    | **YES**    | ?                 | ?      | n/a  | n/a              | n/a    |
| iOS      | Touch      | **YES**    | ?                 | **YES**| n/a  | n/a              | n/a    |
| Android  | Touch      | ?          | ?                 | n/a    | n/a  | n/a              | n/a    |
|          | Cardboard  | ?          | ?                 | n/a    | n/a  | n/a              | n/a    |
|          | Gear VR    | n/a        | n/a               | n/a    | n/a  | ?                | ?      |
|          | Daydream   | ?          | ?                 | n/a    | n/a  | n/a              | n/a    |

Legend:

* **YES**: Confirmed to work
* **?**: Should work, but not tested
* **No**: Does not work
* **n/a**: Not applicable - browser not available on that system/platform

**Please [file an issue](https://github.com/beaucronin/embedding/issues) if you find a compatibility problem on one of the supported system/platform/browser combinations.**

### Notes:

* [Microsoft has announced that it intends to support WebVR in Edge](https://blogs.windows.com/msedgedev/2016/09/09/webvr-in-development-edge/), but this version has not yet shipped.
* Special Chromium builds and/or Firefox Nightlies are currently required to use WebVR with Vive and Rift.
* Windows has been tested with 64-bit Windows 8.

See [https://iswebvrready.org/](https://iswebvrready.org/) for the latest in overall WebVR compatibility, and [https://webvr.info/](https://webvr.info/) for links to the latest browser builds, libraries, and other info.
