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
    return ''
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
