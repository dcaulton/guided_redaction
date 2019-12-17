import React from 'react';
import TemplateControls from './TemplateControls'
import SelectedAreaControls from './SelectedAreaControls'

class BottomInsightsControls extends React.Component {

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
              onClick={() => this.props.loadWorkbook(value['id'], this.props.displayWorkbookLoadedMessage)}
          >
            {value['name']}
          </button>
        )
      })}
          <button 
              className='dropdown-item'
              key='000'
              onClick={() => this.props.loadWorkbook('-1', this.props.displayWorkbookLoadedMessage)}
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
              onClick={() => this.props.deleteWorkbook(value['id'], this.props.displayWorkbookDeletedMessage)}
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

        <TemplateControls 
          setMode={this.props.setMode}
          clearCurrentTemplateAnchor={this.props.clearCurrentTemplateAnchor}
          clearCurrentTemplateMaskZones={this.props.clearCurrentTemplateMaskZones}
          scanTemplate={this.props.scanTemplate}
          submitInsightsJob={this.props.submitInsightsJob}
          clearTemplateMatches={this.props.clearTemplateMatches}
          changeMaskMethodCallback={this.props.changeMaskMethodCallback}
        />

        <SelectedAreaControls
          setMode={this.props.setMode}
          getCurrentTemplateAnchors={this.props.getCurrentTemplateAnchors}
          clearMovieSelectedAreas={this.props.clearMovieSelectedAreas}
          changeMaskMethodCallback={this.props.changeMaskMethodCallback}
          setSelectedAreaTemplateAnchor={this.props.setSelectedAreaTemplateAnchor}
          getCurrentSelectedAreaMeta={this.props.getCurrentSelectedAreaMeta}
        />


        <div className='row bg-light rounded mt-3'>
          <div className='col'>
            <div className='row'>
              <div 
                className='col-lg-9 h3'
              > 
                ocr
              </div>
              <div className='col float-right'>
                <button
                    className='btn btn-link'
                    aria-expanded='false'
                    data-target='#ocr_body'
                    aria-controls='ocr_body'
                    data-toggle='collapse'
                    type='button'
                >
                  show/hide
                </button>
              </div>
            </div>

            <div 
                id='ocr_body' 
                className='row collapse'
            >
              <div id='ocr_main' className='col'>

                <div className='row mt-3 bg-light'>
                
                  <div
                      className='d-inline ml-2 mt-2'
                  >   
                      <input 
                          id='ocr_match_on_text'
                          size='30'
                          value='match on text' 
                          onChange={() => console.log('match on text')}
                      />
                  </div>

                  <div
                      className='d-inline ml-2 mt-2'
                  >   
                      <input 
                          id='ocr_similarity'
                          size='10'
                          value='Similarity %' 
                          onChange={() => console.log('OCR similarity %')}
                      />
                  </div>

                  <div className='d-inline'>
                    <button
                        className='btn btn-primary ml-2 mt-2 dropdown-toggle'
                        type='button'
                        id='scanOcrDropdownButton'
                        data-toggle='dropdown'
                        area-haspopup='true'
                        area-expanded='false'
                    >
                      Run
                    </button>
                    <div className='dropdown-menu' aria-labelledby='scanOcrDropdownButton'>
                      <button className='dropdown-item'
                          onClick={() => alert('scan just this image')}
                      >
                        Image
                      </button>
                      <button className='dropdown-item'
                          onClick={() => alert('scan just this movie')}
                      >
                        Movie
                      </button>
                      <button className='dropdown-item'
                          onClick={() => alert('scan all movies')}
                      >
                        All Movies
                      </button>
                    </div>
                  </div>

                  <div className='d-inline'>
                    <button
                        className='btn btn-primary ml-2 mt-2 dropdown-toggle'
                        type='button'
                        id='deleteOcrDropdownButton'
                        data-toggle='dropdown'
                        area-haspopup='true'
                        area-expanded='false'
                    >
                      Clear
                    </button>
                    <div className='dropdown-menu' aria-labelledby='deleteOcrDropdownButton'>
                      <button className='dropdown-item'
                          onClick={() => alert('clear OCR data for just this image')}
                      >
                        Image
                      </button>
                      <button className='dropdown-item'
                          onClick={() => alert('clear OCR data for all frames of this movie')}
                      >
                        Movie
                      </button>
                      <button className='dropdown-item'
                          onClick={() => alert('clear OCR data for all movies')}
                      >
                        All Movies
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          </div>
        </div>


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

                  <button
                      className='btn btn-primary mt-2 ml-2'
                      onClick={() => this.props.getJobs()}
                  >
                    Get Jobs
                  </button>

                  <div className='d-inline'>
                      {workbook_load_button}
                  </div>

                  <div className='d-inline'>
                      {workbook_delete_button}
                  </div>

                  <button
                      className='btn btn-primary mt-2 ml-2'
                      onClick={() => this.props.saveWorkbook()}
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


      </div>
    )
  }
}

export default BottomInsightsControls;
