import React from 'react';

class BottomInsightsControls extends React.Component {

  render() {
    return (
      <div id='bottom_insights_controls' className='fixed-bottom'>
        <div className='row'>
          <div className='col'>
            <button
                className='btn btn-primary'
                onClick={() => this.props.setMode('add_roi_1')}
            >
              Add ROI
            </button>
          </div>
        </div>

      </div>
    )
  }
}

export default BottomInsightsControls;
