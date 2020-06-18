import React from 'react';
import RedactApplication from './components/guided_redaction/RedactApplication';
import {
  BrowserRouter as Router,
} from "react-router-dom";

class App extends React.Component {
  constructor(props) {
    super(props)
    this.getBaseUrl=this.getBaseUrl.bind(this)
  }

  getBaseUrl(url_name) {
    let api_server_url = ''
    const host = window.location.hostname
    if (host === 'localhost' || host === '127.0.0.1') {
      api_server_url = 'http://localhost:8000/api/'
    } else if (host.match('sykes.com$')) {
      api_server_url = 'https://'+host+'/api/'
    }
   
    return api_server_url
  }

  render() {
    return (
      <div>
        <div id='App-whoami'>
          <div>
            <div />
            <span className='d-none'>
              ;dave.caulton@sykes.com
            </span>
          </div>
        </div>
        <Router>
          <RedactApplication 
            getBaseUrl={this.getBaseUrl}
          />
        </Router>
      </div>
    )
  }
}

export default App;
