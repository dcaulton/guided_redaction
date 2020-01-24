import React from 'react';

class TelemetryControls extends React.Component {

  render() {
    if (!this.props.showTelemetry) {
      return([])
    }

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>
            <div className='row'>
              <div 
                className='col-lg-10 h3'
              > 
                telemetry
              </div>
              <div className='col-lg-1 float-right'>
                <button
                    className='btn btn-link'
                    aria-expanded='false'
                    data-target='#telemetry_body'
                    aria-controls='telemetry_body'
                    data-toggle='collapse'
                    type='button'
                >
                  +/-
                </button>
              </div>
              <div className='col-lg-1'>
                <div>
                  <input
                    className='mr-2 mt-3'
                    type='checkbox'
                    onChange={() => this.props.toggleShowTelemetry()}
                  />
                </div>
              </div>
            </div>

            <div 
                id='telemetry_body' 
                className='row collapse'
            >
              <div id='telemetry_main' className='col'>
              
                <h5>upload telemetry here</h5>
                <h5>run all templates indicated from telemetry here</h5>

              </div>
            </div>

          </div>
        </div>
    )
  }
}

export default TelemetryControls;
