import os
import json
import base64

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

def get_config_value(key, default=None):
  envname = f"PGFARM_{key.upper()}"
  if envname in os.environ:
    return os.environ[envname]
  
  if default is None:
    default = DEFAULTS.get(key, None)

  config = get_config()
  return config.get(key, default)

def get_decoded_jwt():
  jwt = get_config_value("token")
  if jwt:
    return json.loads(
      base64.b64decode(jwt.split(".")[1]+'===').decode('utf-8')
    )
  return None