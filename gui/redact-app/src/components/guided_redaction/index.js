import { observer } from 'mobx-react';
import React from 'react';

import './styles/guided_redaction.css';
import RedactApplication from './RedactApplication';
import whoAmI from '../../stores/whoami'

class fakeWhoAmI {
  async getUser() {
    return 'dave.caulton@sykes.com'
  }
}

const X = observer(class X extends React.Component {

  constructor(props) {
    super(props);
    this.getBaseUrl=this.getBaseUrl.bind(this)
  }

  getBaseUrl(url_name) {
    return '/api/'
  }

  async getWhoAmI() {
    // WhoAmI isn't always functional/stable when running locally 
    await(whoAmI.getUser())
    .then(() => {
      return whoAmI
    })
    .catch((err) => {
      return fakeWhoAmI
    })
  }

  render() {
    const whoAmIToUse = this.getWhoAmI()
    return (
      <div id="redact_application_wrapper">
        <RedactApplication 
          getBaseUrl={this.getBaseUrl}
          whoAmI={whoAmIToUse}
        />
      </div>
    )
  }
});
export default X;
