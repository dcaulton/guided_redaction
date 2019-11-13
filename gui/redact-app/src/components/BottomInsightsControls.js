import React from 'react';

class BottomInsightsControls extends React.Component {

  render() {
    let bottom_y = 100
    const ele = document.getElementById('insights_image_div')
    if (ele) {
      bottom_y += ele.offsetHeight
    }
    const controls_style = {
      top: bottom_y,
    }
    return (
      <div 
          id='bottom_insights_controls' 
          className='fixed-bottom'
          style={controls_style}
      >
        <div className='row'>
          <div className='col'>
            <button
                className='btn btn-primary'
                onClick={() => this.props.setMode('add_roi_1')}
            >
              Add ROI
            </button>
            <button
                className='btn btn-primary ml-5'
                onClick={() => this.props.clearRoiCallback()}
            >
              Clear ROI
            </button>
            <button
                className='btn btn-primary ml-5'
                onClick={() => console.log('fuzzy bunny')}
            >
              Scan 
            </button>
          </div>
        </div>
        <div className='row mt-3'>
          <div className='col'>
            <input 
                id='match_on_text'
                value='match on text'
                onChange={() => console.log('react forces me to put this stupid thing here')}
            />
            <button
                className='btn btn-primary ml-5'
                onClick={() => console.log('runny bunny')}
            >
              Scan Text
            </button>
          </div>
        </div>

      </div>
    )
  }
}

export default BottomInsightsControls;
