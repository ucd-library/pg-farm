# Login Help

This documentation provides guidance on how to log in so you can access a PostgreSQL database hosted by PG Farm.


- [Overview](#overview)
- [Desktop Application Login](#desktop-application-login)
- [CLI Login](#cli-login)


# Overview

PG Farm uses either a UC Davis CAS login or a supplied username and password for external users.  You can login on your computer via the desktop application or CLI (command linge interface).

Once you are logged in you will be provided with a token (think of it as a temporary password) that you can use to access the database.  This token is valid for 7 days, after which you will need to log in again.

Either method will provide you with a token that you can use to access the database.  Additionally your .pg_service file will be updated with the new token for all entries with a `host: pgfarm.library.ucdavis.edu` entry.

# Desktop Application Login

To log in using the desktop application, follow these steps:

1. Download the PG Farm desktop application.
    - Mac: [Mac Silicon](__BASE__/application/download/macOS-arm64-Build.zip), [Mac Intel](__BASE__/application/download/macos-x64-build.zip)
    - Windows: [Windows](__BASE__/application/download/Windows-Build.zip)
    - Linux: [Linux](__BASE__/application/download/Linux-Build.zip)
2. Extract the downloaded file. And run the installer for your platform.
3. Open the PG Farm application on your computer.
4. Click on the "Login" button.
5. Enter your UC Davis CAS credentials or the supplied username and password when prompted.

Once logged in, you will receive a token that you can use to access the database.

# CLI Login

## Prerequisites

1. Ensure you have [Node.js](https://nodejs.org/en/download) installed on your machine.
2. Install the PG Farm CLI by running the following command in your terminal:
    ```bash
    npm install -g @ucd-lib/pg-farm
    ```

## Login Steps

1. Open your terminal.
2. Run the following command to log in:
    ```bash
    pgfarm auth login
    ```
3. Follow the prompts to enter your UC Davis CAS credentials or the supplied username and password.
4. Once logged in, you will receive a token that you can use to access the database which you can access via the following command:
   ```bash
    pgfarm auth token
    ```
5. You can get your login status by running:
    ```bash
    pgfarm config show
    ```