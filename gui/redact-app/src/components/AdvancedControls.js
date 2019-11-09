import React from 'react';

class AdvancedControls extends React.Component {
  render() {
    if (this.props.showAdvancedControls) {
    return (
      <div id='advanced_controls_div'>
        <div className='row'>
          <button
              className='btn btn-primary'
          >
            HOG
          </button>
        </div>
        <div className='row mt-5'>
          <div id='anchor_div'>
            <button className='btn btn-primary dropdown-toggle' type='button' id='anchorDropdownButton'
                data-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>
              Template
            </button>
            <div 
                className='dropdown-menu mt-5' 
                aria-labelledby='anchorDropdownButton'>
              <button className='dropdown-item'
                  onClick={() => this.props.setModeCallback('template_add_anchor_1', '')}>
                Add Anchor
              </button>
              <button className='dropdown-item'
                  onClick={() => this.props.setModeCallback('template_find_related_1', '')}
                  href='.'>
                Find Related
              </button>
              <button className='dropdown-item'
                  onClick={() => this.props.setModeCallback('template_set_current_1', '')}
                  href='.'>
                Set Current
              </button>
              <button className='dropdown-item'
                  onClick={() => this.props.setModeCallback('template_test_current_1', '')}
                  href='.'>
                Test Current
              </button>
              <button className='dropdown-item'
                  onClick={() => this.props.setModeCallback('template_run_current_1', '')}
                  href='.'>
                Run and add to Redaction Areas
              </button>
            </div>
          </div>

        </div>        

      </div>
    )
    } else {
      return (<div id="advanced_controls_div" />)
    }
  }
}

export default AdvancedControls;
