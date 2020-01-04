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

  buildGlobalStateBox() {
    return (
      <textarea
         cols='80'
         rows='10'
         value='paste a json dict here to update'
         onChange={(event) => this.props.updateGlobalState(event.target.value)}
      />
    )
  }

  buildCampaignMoviesBox() {
    const campaign_movies_string = this.props.campaign_movies.join('\n')
    return (
      <textarea
         cols='80'
         rows='10'
         value={campaign_movies_string}
         onChange={(event) => this.props.setCampaignMovies(event.target.value)}
      />
    )
  }

  render() {
    let campaign_movies_box = this.buildCampaignMoviesBox()
    let update_state_box = this.buildGlobalStateBox()
    let workbook_load_button = this.buildWorkbookPickerButton()
    let workbook_delete_button = this.buildWorkbookDeleteButton()
    let show_templates_checked = ''
    if (this.props.showTemplates) {
      show_templates_checked = 'checked'
    }
    let show_selected_area_checked = ''
    if (this.props.showSelectedArea) {
      show_selected_area_checked = 'checked'
    }
    let show_movie_sets_checked = ''
    if (this.props.showMovieSets) {
      show_movie_sets_checked = 'checked'
    }
    let show_results_checked = ''
    if (this.props.showResults) {
      show_results_checked = 'checked'
    }
    let show_annotate_checked = ''
    if (this.props.showAnnotate) {
      show_annotate_checked = 'checked'
    }
    let show_ocr_checked = ''
    if (this.props.showOcr) {
      show_ocr_checked = 'checked'
    }

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

                <div className='row mt-3 bg-light rounded'>
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

                  <div
                      className='d-inline ml-2 mt-2'
                  >   
                     <select
                        title='Frameset Discriminator'
                        name='frameset_discriminator'
                        onChange={(event) => this.props.setFramesetDiscriminator(event.target.value)}
                     >
                      <option value='gray8'>--FramesetDiscriminator--</option>
                      <option value='gray64'>gray 64x64</option>
                      <option value='gray32'>gray 32x32</option>
                      <option value='gray16'>gray 16x16</option>
                      <option value='gray8'>gray 8x8 (default)</option>
                      <option value='gray6'>gray 6x6</option>
                      <option value='gray4'>gray 4x4</option>
                    </select>
                  </div>

                </div>

                <div className='row mt-3 bg-light rounded'>
                  <input
                    className='ml-2 mr-2 mt-1'
                    id='toggle_annotate'
                    checked={show_templates_checked}
                    type='checkbox'
                    onChange={() => this.props.toggleShowTemplates()}
                  />
                  Show Templates
                </div>

                <div className='row mt-3 bg-light rounded'>
                  <input
                    className='ml-2 mr-2 mt-1'
                    id='toggle_results'
                    checked={show_selected_area_checked}
                    type='checkbox'
                    onChange={() => this.props.toggleShowSelectedArea()}
                  />
                  Show Selected Area
                </div>

                <div className='row mt-3 bg-light rounded'>
                  <input
                    className='ml-2 mr-2 mt-1'
                    id='toggle_annotate'
                    checked={show_annotate_checked}
                    type='checkbox'
                    onChange={() => this.props.toggleShowAnnotate()}
                  />
                  Show Annotate
                </div>

                <div className='row mt-3 bg-light rounded'>
                  <input
                    className='ml-2 mr-2 mt-1'
                    id='toggle_results'
                    checked={show_ocr_checked}
                    type='checkbox'
                    onChange={() => this.props.toggleShowOcr()}
                  />
                  Show Ocr
                </div>

                <div className='row mt-3 bg-light rounded'>
                  <input
                    className='ml-2 mr-2 mt-1'
                    id='toggle_movie_sets'
                    checked={show_movie_sets_checked}
                    type='checkbox'
                    onChange={() => this.props.toggleShowMovieSets()}
                  />
                  Show Movie Sets
                </div>

                <div className='row mt-3 bg-light rounded'>
                  <input
                    className='ml-2 mr-2 mt-1'
                    id='toggle_results'
                    checked={show_results_checked}
                    type='checkbox'
                    onChange={() => this.props.toggleShowResults()}
                  />
                  Show Results
                </div>

                <div className='row mt-4'>
                  <div className='d-inline'>
                    <span className='h5'>Campaign Movies</span>
                    {campaign_movies_box}
                  </div>
                </div>

                <div className='row mt-4'>
                  <div className='d-inline'>
                    <span className='h5'>Update Global State</span>
                    {update_state_box}
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
