import React from 'react';

class PipelineControls extends React.Component {

  render() {
    if (!this.props.visibilityFlags['pipelines']) {
      return([])
    }

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>
            <div className='row'>
              <div 
                className='col-lg-10 h3'
              > 
                pipelines
              </div>
              <div className='col-lg-1 float-right'>
                <button
                    className='btn btn-link'
                    aria-expanded='false'
                    data-target='#pipelines_body'
                    aria-controls='pipelines_body'
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
                    onChange={() => this.props.toggleShowVisibility('pipelines')}
                  />
                </div>
              </div>
            </div>

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
