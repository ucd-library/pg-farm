# PG Farm
PG Farm - Version 2


## Access

First make sure you have the PG Farm CLI installed (requires python + pip with seetup tools).  Additionally you need to PostgreSQL client (psql) installed on your machine for this example.

This might already by installed, but incase not:
```
pip install setuptools
```

Then install the PG Farm CLI:

```bash
pip install \
  --extra-index-url https://us-python.pkg.dev/pgfarm-419213/pip/simple/ \
  pgfarm
```

Notes on installation:
  - If you see a warning like `WARNING: The script chevron is installed in '/Library/Frameworks/Python.framework/Versions/3.11/bin' which is not on PATH.`, or similar you can do the following:
    - Add the path to your PATH variable in your shell profile (e.g. `~/.bash_profile`, `~/.zshrc`, etc.)
    - `export PATH=$PATH:/Library/Frameworks/Python.framework/Versions/3.11/bin`
    - Then restart your shell or run `source ~/.bash_profile` or `source ~/.zshrc` to reload the profile.
    - Alternatively you can symlink the script to a directory that is on your PATH, e.g. `ln -s /Library/Frameworks/Python.framework/Versions/3.11/bin/pgfarm /usr/local/bin/pgfarm`



Then login and connect to database

```bash
pgfarm auth login
export PGSERVICE=pgfarm
psql [database]
```

`pgfarm connect --help` will show you more options for connecting to the database.

`pgfarm auth --help` will show you more options for authentication and accessing your current athentication token.