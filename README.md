# pb-sync

A tool for Pixelblaze for managing patterns on the device

## Features

- Backup all patterns from device ~(TODO)~ (implemented!)
- Sync all patterns to device (TODO)
- Sync patterns between devices (TODO)
- Watch a directory to auto-upload patterns to the device (TODO)
- List, enable, and disable patterns from the pattern store (TODO)
- Upload patterns to the pattern store (TODO)
- Provide robust, generic interface for interacting with Pixelblaze (TODO)

## backup

The backup command will backup the patterns on a Pixelblaze to a directory on your computer.

### usage

`./bin/pb-sync.sh backup <pixelblaze name> <backup dir>`

It will create a subdirectory in `<backup dir>` with the name of the Pixelblaze.  In
this directory it will create `.epe` files for each individual pattern, and also create
a `metadata.json` file that contains the Pixelblaze configuration along with metdata
for the patterns so we can sync them back to the Pixelblaze later.
