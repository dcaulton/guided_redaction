import React from 'react';

class SessionControls extends React.Component {

  buildWorkbookPickerButton() {
    let return_array = []
    if (this.props.workbooks.length) {
      return_array.push(
        <div key='lsls234'>
        <button
            key='wb_names_button'
            className='btn btn-primary ml-2 mt-2 dropdown-toggle'
            type='button'
            id='loadWorkbookDropdownButton'
            data-toggle='dropdown'
            area-haspopup='true'
            area-expanded='false'
        >
          Load Workbook
        </button>
        <div className='dropdown-menu' aria-labelledby='loadWorkbookDropdownButton'>
      {this.props.workbooks.map((value, index) => {
        return (
          <button 
              className='dropdown-item'
              key={index}
              onClick={() => 
                this.props.loadWorkbook(value['id'], 
                this.props.displayInsightsMessage('Workbook has been loaded'))
              }
          >
            {value['name']}
          </button>
        )
      })}
          <button 
              className='dropdown-item'
              key='000'
              onClick={() => 
                this.props.loadWorkbook('-1', 
                this.props.displayInsightsMessage('Workbook has been loaded'))
              }
          >
            none
          </button>
        </div>
        </div>
      )
    }
    return return_array
  }

  buildWorkbookDeleteButton() {
    let return_array = []
    if (this.props.workbooks.length) {
      return_array.push(
        <div key='ls224'>
        <button
            key='wb_delete_button'
            className='btn btn-primary ml-2 mt-2 dropdown-toggle'
            type='button'
            id='deleteWorkbookDropdownButton'
            data-toggle='dropdown'
            area-haspopup='true'
            area-expanded='false'
        >
          Delete Workbook
        </button>
        <div className='dropdown-menu' aria-labelledby='deleteWorkbookDropdownButton'>
      {this.props.workbooks.map((value, index) => {
        return (
          <button 
              className='dropdown-item'
              key={index}
              onClick={() => 
                this.props.deleteWorkbook(value['id'], 
                this.props.displayInsightsMessage('Workbook has been deleted'))
              }
          >
            {value['name']}
          </button>
        )
      })}
        </div>
        </div>
      )
    }
    return return_array
  }

  render() {
    let workbook_load_button = this.buildWorkbookPickerButton()
    let workbook_delete_button = this.buildWorkbookDeleteButton()

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>
            <div className='row'>
              <div 
                className='col-lg-9 h3'
              > 
                session
              </div>
              <div className='col float-right'>
                <button
                    className='btn btn-link'
                    aria-expanded='false'
                    data-target='#session_body'
                    aria-controls='session_body'
                    data-toggle='collapse'
                    type='button'
                >
                  show/hide
                </button>
              </div>
            </div>

            <div 
                id='session_body' 
                className='row collapse'
            >
              <div id='session_main' className='col'>

                <div className='row mt-3 bg-light rounded mt-3'>
                  <button
                      className='btn btn-primary mt-2 ml-2'
                      onClick={() => this.props.callPing()}
                  >
                    Ping
                  </button>

                  <div className='d-inline'>
                      {workbook_load_button}
                  </div>

                  <div className='d-inline'>
                      {workbook_delete_button}
                  </div>

                  <button
                      className='btn btn-primary mt-2 ml-2'
                      onClick={() => 
                        this.props.saveWorkbook(
                          this.props.displayInsightsMessage('Workbook has been saved')
                        )
                      }
                  >
                    Save Workbook
                  </button>

                  <div
                      className='d-inline ml-2 mt-2'
                  >   
                    <input 
                        id='workbook_name'
                        key='workbook_name_1'
                        size='20'
                        value={this.props.current_workbook_name}
                        onChange={(event) => this.props.saveWorkbookName(event.target.value)}
                    />
                  </div>

                </div>

              </div>
            </div>
          </div>
        </div>
    )
  }
}

export default SessionControls;
