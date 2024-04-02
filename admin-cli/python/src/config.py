import os
import json

DOT_FILE_PATH = os.path.join(os.path.expanduser("~"), ".pg-farm.json")

DEFAULTS = {
  "host": "https://pgfarm.library.ucdavis.edu",
  "loginPath": "/login",
}

def save_config(config):
  with open(DOT_FILE_PATH, "w") as dot_file:
    json.dump(config, dot_file)

def get_config():
  if not os.path.exists(DOT_FILE_PATH):
    return {}
  with open(DOT_FILE_PATH, "r") as dot_file:
    config = json.load(dot_file)

  return config

def set_config_value(key, value):
  config = get_config()
  config[key] = value
  save_config(config)

def get_config_value(key):
  envname = f"PGFARM_{key.upper()}"
  if envname in os.environ:
    return os.environ[envname]

  config = get_config()
  return config.get(key, DEFAULTS.get(key, None))
