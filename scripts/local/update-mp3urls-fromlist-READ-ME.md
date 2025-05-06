# Podcast MP3 URL Updater

## Overview

This script updates MP3 file URLs in a podcast feed XML file. It was specifically created to:

1. Change the base URL from `https://www.techlifepodcast.com/Episodes/` to `https://media.techlifepodcast.com/e/`
2. Convert all filenames in the URLs to lowercase
3. Preserve the rest of the XML structure (including enclosure tags, CDATA sections, etc.)

## Prerequisites

- macOS with zsh shell
- A podcast feed XML file
- Sufficient permissions to read/write the podcast feed file

## Installation

1. Place the `update-mp3urls-fromlist.sh` script in your repository's `scripts/local/` directory
2. Make the script executable:
   ```
   chmod +x update-mp3urls-fromlist.sh
   ```

## Usage

Run the script from the `scripts/local/` directory:

```bash
cd /path/to/repository/scripts/local/
./update-mp3urls-fromlist.sh
```

The script will:
1. Create a backup of your podcast feed
2. Update the base URL and convert filenames to lowercase
3. Create a log file with details of the changes

## File Paths

The script assumes the following structure:
```
/repository-root/
  ├── public/
  │   └── podcast-feed.xml
  └── scripts/
      └── local/
          ├── update-mp3urls-fromlist.sh
          └── list-of-episodes.txt (optional)
```

## How It Works

1. Makes a backup of your podcast feed
2. Updates all URLs from `https://www.techlifepodcast.com/Episodes/FILENAME.mp3` to `https://media.techlifepodcast.com/e/filename.mp3`
3. Converts all filenames to lowercase
4. Preserves all XML tags and structure
5. Creates a log file with details of what was changed

## Output Files

- **Backup file**: `public/podcast-feed.backup.xml`
- **Log file**: `scripts/local/update-mp3urls.log`

## Troubleshooting

If the script doesn't run correctly:

1. Make sure the podcast feed XML exists at the expected location
2. Check that you have read/write permissions for the files
3. Confirm that the XML file has the expected URL pattern
4. Examine the log file for details about what was changed

## Creating the Episode List

The script includes a comment about creating a list of episodes by running:

```bash
ls -1v
```

In the "e" folder on the server. This list can be used to verify the filenames, though the script doesn't directly require it.

## Notes

- The script is designed to be used in a Tapirio node-based CMS
- It only modifies the URL attribute in enclosure tags
- It preserves GUID tags and other XML elements
- It creates a backup before making any changes