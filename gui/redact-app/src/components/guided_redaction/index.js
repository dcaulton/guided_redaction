import { observer } from 'mobx-react';
import React from 'react';

import './styles/guided_redaction.css';
import RedactApplication from './RedactApplication';
import whoAmI from '../../stores/whoami'

const X = observer(class X extends React.Component {

  constructor(props) {
    super(props);
    this.getBaseUrl=this.getBaseUrl.bind(this)
  }

  getBaseUrl(url_name) {
    return '/api/'
  }

  render() {
    return (
      <div id="redact_application_wrapper">
        <RedactApplication 
          getBaseUrl={this.getBaseUrl}
          whoAmI={whoAmI}
        />
      </div>
    )
  }
});
export default X;
