# Labeleer CLI

This is a command-line tool to synchronize your localization labels between your local project and the Labeleer platform.

## Getting Started

### 1. Authentication

The CLI requires your Labeleer **Access Token** to authenticate requests. You can provide it in several ways:

- **CLI Option**: Pass `--access-token <token>` when running the CLI.
- **Environment Variable**: Set `LABELEER_ACCESS_TOKEN` in your environment.
- **`.env` file (recommended)**: Define `LABELEER_ACCESS_TOKEN` in a `.env` file (e.g., `.env`, `.env.local`) in your project's root directory:

    ```env
    LABELEER_ACCESS_TOKEN="<your_access_token>"
    ```

    If multiple `.env` files are found, you will be prompted to select which one to use.

### 2. Project Configuration (`labeleer.json`)

Project settings are stored in `labeleer.json` (or a custom path provided via `--config <path>`).

If no configuration file exists when you run the CLI, an interactive setup will prompt you for your **Project ID** and desired **format**, and automatically generate the configuration file and initialize your label files.

#### Single-File Format Configuration

For formats that store all translations in a single file (e.g., JSON, YAML, Apple XCStrings):

```json
{
  "projectId": "<your_project_id>",
  "rootDir": ".",
  "format": "json",
  "labelFile": "labels.json"
}
```

#### Multi-File (Per-Locale) Format Configuration

For formats that store translations in separate files per locale (e.g., Apple Strings, Android Strings, XLIFF, PO, Qt Linguist):

```json
{
  "projectId": "<your_project_id>",
  "rootDir": ".",
  "format": "apple_strings",
  "paths": {
    "en_US": "locales/en.strings",
    "de_DE": "locales/de.strings"
  }
}
```

## Supported Formats

Labeleer CLI supports various translation file formats:

| Format | Identifier | Type | File Extensions |
| :--- | :--- | :--- | :--- |
| **JSON** | `json` | Single-file | `.json` |
| **YAML** | `yaml` | Single-file | `.yaml`, `.yml` |
| **Apple XCStrings** | `xcstrings` | Single-file | `.xcstrings` |
| **Apple Strings** | `apple_strings` | Multi-file (per locale) | `.strings` |
| **Android Strings** | `android_strings` | Multi-file (per locale) | `.xml` |
| **XLIFF (2.1)** | `xliff` | Multi-file (per locale) | `.xliff`, `.xlf` |
| **PO (Gettext)** | `po` | Multi-file (per locale) | `.po`, `.pot` |
| **Qt Linguist** | `ts` | Multi-file (per locale) | `.ts` |

## Usage

To start using the CLI, run the following command in your project's root directory:

```bash
npx labeleer-cli
```

### Options

- `--access-token <token>`: Provide your Labeleer access token directly.
- `--config <path>`: Specify a custom path to your project configuration file.

## Features

- **Interactive & User-Friendly**: Step-by-step interactive CLI to manage localization workflows seamlessly.
- **Automatic Config & Env Detection**: Automatically detects `.env` files and `labeleer.json` project configuration.
- **Fetch Labels**: Download the latest labels and translations from your Labeleer project to your local files.
- **Publish Local Labels**: Upload your local label changes back to your Labeleer project across all supported formats.
- **Create New Labels**: Add and configure new localization labels directly from the command line.
- **Initial Setup Wizard**: Easily initialize project configuration and generate label files in your chosen format.
