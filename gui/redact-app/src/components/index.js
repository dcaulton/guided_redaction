import { observer } from 'mobx-react';
import React from 'react';

import './styles/guided_redaction.css';
import RedactApplication from './RedactApplication';


const X = observer(class X extends React.Component {
  render() {
    return (
      <div className="redact_application_wrapper mt-0">
        <RedactApplication />
      </div>
    )
  }
});
export default X;
