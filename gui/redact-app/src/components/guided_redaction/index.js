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
    let poll_for_jobs = false
    // this is needed because, to run this locally on my mac, I nee to use eventlet.  When I do that 
    //   jobs.models.broadcast_percent_complete won't work, we can't push status updates to a websocket.
    //   so it's run big tasks locally, or run websockets locally, not a pleasant choice.
    if (window.location.hostname === 'localhost') {
      poll_for_jobs = true
    }
    const whoAmIToUse = this.getWhoAmI()
    return (
      <div id="redact_application_wrapper">
        <RedactApplication 
          getBaseUrl={this.getBaseUrl}
          whoAmI={whoAmIToUse}
          poll_for_jobs={poll_for_jobs}
        />
      </div>
    )
  }
});
export default X;
