import { observer } from 'mobx-react';
import React from 'react';

import './styles/guided_redaction.css';
import RedactApplication from './RedactApplication';


const X = observer(class X extends React.Component {

  constructor(props) {
    super(props);
    this.getBaseUrl=this.getBaseUrl.bind(this)
  }

  getBaseUrl(url_name) {
    let api_server_url = ''
    const host = window.location.hostname
    api_server_url = 'https://'+host+'/api/'
    return api_server_url
  }

  render() {
    return (
      <div className="redact_application_wrapper">
        <RedactApplication 
          getBaseUrl={this.getBaseUrl}
        />
      </div>
    )
  }
});
export default X;
