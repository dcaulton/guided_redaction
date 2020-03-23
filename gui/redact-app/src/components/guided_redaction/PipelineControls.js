import React from 'react';
import {
  makeHeaderRow,
} from './SharedControls'

class PipelineControls extends React.Component {

  render() {
    if (!this.props.visibilityFlags['pipelines']) {
      return([])
    }
    const header_row = makeHeaderRow(
      'pipelines',
      'pipelines_body',
      (()=>{this.props.toggleShowVisibility('pipelines')})
    )

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>

            {header_row}

            <div 
                id='pipelines_body' 
                className='row collapse'
            >
              <div id='pipelines_main' className='col'>

                <div className='row bg-light'>
                  <div className='d-inline ml-2 mt-2' >   
                  stuff
                  </div>

                  <div className='d-inline ml-2 p-2 border' >   
                   other stuff
                  </div>


                </div>

              </div>
            </div>

          </div>
        </div>
    )
  }
}

export default PipelineControls;
