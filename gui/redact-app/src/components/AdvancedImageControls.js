import React from 'react';

class AdvancedImageControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      campaignName: '',
      templates: {},
      currentTemplate: '',
      hogs: {},
    }
  }

  changeCampaign = (newCampaignName) => {
    console.log('campaign is now '+newCampaignName)
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
          <div className='row mt-5'>
            <div id='anchor_div'>
              <button className='btn btn-primary dropdown-toggle' type='button' id='anchorDropdownButton'
                  data-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>
                Template
              </button>
              <div 
                  className='dropdown-menu mt-1' 
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
                    onClick={() => this.props.setModeCallback('template_save_current_1', '')}
                    href='.'>
                  Save Current
                </button>
                <button className='dropdown-item'
                    onClick={() => this.props.setModeCallback('template_run_current_1', '')}
                    href='.'>
                  Run and add to Redaction Areas
                </button>
              </div>
            </div>
          </div>        
          <div className='row mt-5'>
              <select
                  name='mask_method'
                  onChange={(event) => this.changeCampaign(event.target.value)}
              >
                <option value=''>-- campaign --</option>
                <option value='TestCampaign'>test campaign</option>
              </select>
          </div>        

        </div>
      )
    } else {
      return (<div id="advanced_controls_div" />)
    }
  }
}

export default AdvancedImageControls;
