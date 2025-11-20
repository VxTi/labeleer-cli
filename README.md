# Labeleer CLI

This is a command-line tool to synchronize your localization labels between your local project and the Labeleer platform.

## Getting Started

### 1. Environment Configuration

Before you begin, the CLI needs your Labeleer **Project ID** and **Access Token**. There are two ways to provide them:

-   **`.env` file (recommended)**: Create a `.env` file (e.g., `.env`, `.env.local`) in your project's root directory. The CLI will automatically detect and use it.

    ```env
    LABELEER_PROJECT_ID="<your_project_id>"
    LABELEER_ACCESS_TOKEN="<your_access_token>"
    ```

    If multiple `.env` files are found, you will be prompted to select which one to use.

-   **Manual Input**: If no `.env` file is found, the CLI will prompt you to enter your credentials securely.

### 2. Label File

The CLI works with a local label file in one of the following formats:
- `labels.json`
- `labels.yaml`
- `labels.xml`

If the CLI detects multiple label files in your project, it will ask you to choose one. If no label file is found, it will offer to create one for you.

## Usage

To start using the CLI, run the following command in your project's root directory:

```bash
npx labeleer-cli
```

This will launch an interactive prompt that guides you through the available actions.

## Features

-   **Interactive & User-Friendly**: The CLI provides a step-by-step interactive experience, making it easy to manage your labels.
-   **Automatic Configuration Detection**: Automatically finds and uses your `.env` and `labels` files.
-   **Fetch Labels**: Download the latest labels from your Labeleer project and save them to your local file (`labels.json`, `labels.yaml`, or `labels.xml`).
-   **Sync to Remote**: Upload your local label changes to your Labeleer project. **Note**: This feature currently only supports the `JSON` format.
-   **File Creation**: If no `labels` file is found, the CLI can create one for you in your desired format.
