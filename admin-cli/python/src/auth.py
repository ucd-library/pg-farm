from .http_login_server import start_http_server
from .config import get_config_value, get_config, save_config, update_pgservice
import webbrowser
import requests
import urllib.parse
import json
import os
import hashlib
import base64

class Auth:

  def __init__(self):
    pass

  def login(self):
    host = get_config_value("host")
    
    redirect_url = "http://localhost:3210"
    encoded_redirect_url = urllib.parse.quote(redirect_url, safe='')
    
    url = f"{host}/login?redirect={encoded_redirect_url}&includeJwt=true"

    # Open web browser to host address
    webbrowser.open(url)
    
    print(f"If the web browser did not open, please visit the following URL: {url}")

    start_http_server()

  def service_account_login(self, username, opts={}):
    host = get_config_value("host")

    if "file" in opts and opts["file"]:
      with open(opts["file"], "r") as file:
        secret = file.read()
    elif "env" in opts and opts["env"]:
      secret = os.getenv(opts["env"])
    
    url = f"{host}/auth/service-account/login"

    headers = {
      "Content-Type": "application/json"
    }

    data = {
      "username": username,
      "secret": secret
    }

    response = requests.post(url, headers=headers, data=json.dumps(data))

    if( response.status_code != 200 ):
      print(f"Login failed {response.text}")
      return

    response_data = response.json()
    jwt = response_data["access_token"]
    md5_hash = hashlib.md5(jwt.encode()).digest()
    md5_hash = base64.b64encode(md5_hash).decode()

    # Write JWT token as a dot file in the user's home directory
    config = get_config()
    config["token"] = jwt
    config["tokenHash"] = f"urn:md5:{md5_hash}"
    save_config(config)

    # Update the PGSERVICE file
    update_pgservice()

  def get_token(self, jwt=False):
    if( jwt ):
      return get_config_value("token")
    return get_config_value("tokenHash")
  
def set_auth_header(headers={}):
  headers["Authorization"] = f"Bearer {get_config_value('tokenHash')}"
  return headers