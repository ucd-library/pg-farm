import os
import json
import base64
import configparser
from urllib.parse import urlparse

DOT_FILE_PATH = os.path.join(os.path.expanduser("~"), ".pg-farm.json")
PGSERVICE_FILE_PATH = os.path.join(os.path.expanduser("~"), ".pg_service.conf")

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

def update_pgservice():
  token = get_config_value("tokenHash")
  user = get_decoded_jwt()
  host = get_config_value("host")

  if token is None or user is None or host is None:
    return
  
  host = urlparse(host).hostname

  config = configparser.ConfigParser()

  if os.path.exists(PGSERVICE_FILE_PATH):
    config.read(PGSERVICE_FILE_PATH)

    if 'pgfarm' in config:
      config.remove_section('pgfarm')

  config['pgfarm'] = {
    'host': host,
    'port': 5432,
    'user': user.get('preferred_username', user.get('username')),
    'password': token
  }

  with open(PGSERVICE_FILE_PATH, 'w') as configfile:
    config.write(configfile, space_around_delimiters=False)
