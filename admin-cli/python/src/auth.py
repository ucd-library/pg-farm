from .http_login_server import start_http_server
from .config import get_config_value
import webbrowser
import requests
import urllib.parse
import json

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

  def get_token(self, jwt=False):
    if( jwt ):
      return get_config_value("token")
    return get_config_value("tokenHash")
  
def set_auth_header(headers={}):
  headers["Authorization"] = f"Bearer {get_config_value('tokenHash')}"
  return headers