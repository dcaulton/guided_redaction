import React from 'react';
import {
  makeHeaderRow,
} from './SharedControls'

class SetToolsControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      whatever: '',
    }
  }

  render() {
    if (!this.props.visibilityFlags['set_tools']) {
      return([])
    }
    const header_row = makeHeaderRow(
      'set tools',
      'set_tools_body',
      (() => this.props.toggleShowVisibility('set_tools'))
    )

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>

            {header_row}

            <div 
                id='set_tools_body' 
                className='row collapse'
            >
              <div id='set_tools_main' className='col'>
                ALL THE SET TOOLS
              </div>
            </div>

          </div>
        </div>
    )
  }
}

export default SetToolsControls;
