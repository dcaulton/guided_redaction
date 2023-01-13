import React from 'react';
import RedactApplication from './components/guided_redaction/RedactApplication';
import {
  BrowserRouter as Router,
} from "react-router-dom";


class WhoAmI {
  async getUser() {
    return 'dave.caulton@sykes.com'
  }
}

class App extends React.Component {
  constructor(props) {
    super(props)
    this.getBaseUrl=this.getBaseUrl.bind(this)
  }

  getBaseUrl(url_name) {
    let api_server_url = ''
    const host = window.location.hostname
    if (host === 'localhost' || host === '127.0.0.1') {
      api_server_url = 'http://localhost:8002/api/'
    } else {
      api_server_url = 'https://'+host+'/api/'
    }
    return api_server_url
  }

  render() {
    let whoAmI = new WhoAmI()

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
            whoAmI={whoAmI}
            poll_for_jobs='yes'
            show_insights='yes'
            hide_precision_learning='yes'
          />
        </Router>
      </div>
    )
  }
}

export default App;
