import React from 'react';

class AdvancedImageControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      templates: {},
      currentTemplate: '',
      hogs: {},
    }
  }

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
          <div id='template_div' className='row mt-5'>
            <div id='template_actions' className='row'>
              <button className='btn btn-primary dropdown-toggle' type='button' id='anchorDropdownButton'
                  data-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>
                Template
              </button>
              <div 
                  className='dropdown-menu mt-1' 
                  aria-labelledby='anchorDropdownButton'>
                <button className='dropdown-item'
                    onClick={() => this.props.setModeCallback('template_create_1', '')}
                >
                  New
                </button>
                <button className='dropdown-item'
                    onClick={() => this.props.setModeCallback('template_add_anchor_1', '')}
                >
                  Add Anchor
                </button>
                <button className='dropdown-item'
                    onClick={() => this.props.setModeCallback('template_find_related_1', '')}
                >
                  Find Related
                </button>
                <button className='dropdown-item'
                    onClick={() => this.props.setModeCallback('template_test_current_1', '')}
                >
                  Test Current
                </button>
                <button className='dropdown-item'
                    onClick={() => this.props.setModeCallback('template_save_current_1', '')}
                >
                  Save Current
                </button>
                <button className='dropdown-item'
                    onClick={() => this.props.setModeCallback('template_run_current_1', '')}
                >
                  Run and add to Redaction Areas
                </button>
              </div>
            </div>
          </div>        
          <div id='current_template_info' className='row'>
            Template Info
          </div>
        </div>
      )
    } else {
      return (<div id="advanced_controls_div" />)
    }
  }
}

export default AdvancedImageControls;
