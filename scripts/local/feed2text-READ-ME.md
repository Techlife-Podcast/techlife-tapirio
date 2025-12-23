# Feed2Text Script

## Overview

The `feed2text.sh` script is a tool designed to parse RSS podcast feeds in XML format and convert them into clean, structured text. It's specifically optimized for the "Технологии и жизнь" podcast but can be adapted for other RSS feeds.

## Features

- Extracts podcast title, descriptions, and episode information
- Removes duplicate content (e.g., when `<description>` and `<content:encoded>` contain the same information)
- Converts external links to plain text bullet points
- Removes boilerplate content at the end of descriptions
- Ignores images and other media elements
- Simplifies verbose episode descriptions into cleaner paragraphs

## Requirements

- zsh shell (comes pre-installed on macOS)
- Standard Unix tools (grep, sed, etc.)
- Properly formatted RSS/XML feed file

## Installation

1. Place the `feed2text.sh` script in your `scripts/local/` directory
2. Make it executable by running: `chmod +x feed2text.sh`

## Usage

1. Navigate to your scripts/local directory where the script is located
2. Run the script: `./feed2text.sh`
3. The script will ask you to confirm the default RSS feed path (../../public/podcast-feed.xml)
4. If you want to use a different feed file, select 'n' and enter the path
5. Confirm processing to continue
6. The output will be saved as `feed-as-text.txt` in the same directory as the input file

## Output Format

The script creates a Markdown-formatted text file with:

- Podcast title and description at the top
- Each episode as a separate section with:
  - Title and publication date as a header
  - Description paragraphs
  - Bullet-pointed list of links and references

## Customization

You can modify the script to accommodate different RSS feed structures by:

- Adjusting the grep and sed patterns to match your feed's XML structure
- Modifying the content extraction logic if your feed uses different tags
- Changing the output format to suit your needs

## Troubleshooting

- If the script produces empty or incomplete output, check that your XML is properly formatted
- For parsing errors, verify that your feed contains the expected tags (`<item>`, `<title>`, `<description>`, etc.)
- If links aren't processed correctly, adjust the list item extraction logic

## Limitations

- The script is optimized for specific RSS feed structures and may need adjustments for other feeds
- Complex HTML formatting in descriptions may not be preserved
- Very large feeds may take longer to process

## License

This script is provided as-is for personal use.
