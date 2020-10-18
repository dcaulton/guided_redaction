import React from 'react';
import {
  buildFramesetDiscriminatorSelect
} from './redact_utils.js'
import {
  makePlusMinusRowLight,
} from './SharedControls'

class SessionControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      job_id: '',
      cv_worker_id: '',
      cv_worker_type: 'call_back',
      cv_worker_supported_operations: [],
    }
    this.recognizer = {}
  }

  setLocalStateVar(var_name, var_value, when_done=(()=>{})) {
    this.setState({
      [var_name]: var_value,
      unsaved_changes: true,
    },
    when_done())
  }

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
              onClick={() => this.doWorkbookLoad(value['id'])}
          >
            {value['name']}
          </button>
        )
      })}
          <button 
              className='dropdown-item'
              key='000'
              onClick={() => this.doWorkbookLoad('-1')}
          >
            none
          </button>
        </div>
        </div>
      )
    }
    return return_array
  }

  doWorkbookLoad(workbook_id) {
    this.props.loadWorkbook(
      workbook_id,
      this.props.displayInsightsMessage('Workbook has been loaded')
    )
    this.props.getPipelines()
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
         rows='2'
         value=''
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

  buildWorkbookPlaySoundCheckbox() {
    let checked_state = ''
    if (this.props.current_workbook_play_sound) {
      checked_state = 'checked'
    } 
    return (
      <div className='row mt-3 bg-light rounded'>
        <input
          className='ml-2 mr-2 mt-1'
          id='toggle_play_sound'
          checked={checked_state}
          type='checkbox'
          onChange={(event) => this.setWorkbookSound(event.target.value)}
        />
        Play Sound
      </div>
    )
  }

  buildWhenDoneSelector() {
    return (
      <div>
        <select
            name='when_done_selector'
            onChange={(event) => this.props.setGlobalStateVar('whenDoneTarget', event.target.value)}
            value={this.props.whenDoneTarget}
        >
          <option value=''>--none--</option>
          <option value='learn_dev'>Learn Dev</option>
          <option value='learn_prod'>Learn Prod</option>
        </select>
        <span
          className='ml-2'
        >
          Provide link on Image panel to forward to this instance
        </span>
      </div>
    )
  }

  buildUserToneSelector() {
    return (
      <div>
        <select
            name='when_done_selector'
            onChange={(event) => this.setUserTone(event.target.value)}
            value={this.props.session_audio['userTone']}
        >
          <option value=''>--none--</option>
          <option value='blip'>Blip</option>
          <option value='lfo'>LFO</option>
          <option value='kick_snare'>Kick+Snare</option>
        </select>
        <span
          className='ml-2'
        >
          user tone
        </span>
      </div>
    )
  }

  buildWorkbookId() {
    if (this.props.current_workbook_name === '') {
      return ''
    }
    const the_id = this.props.current_workbook_id
    return (
      <div className='row ml-2 bg-light'>
        <div
            className='d-inline'
        >
          Workbook Id: 
        </div>
        <div 
            className='d-inline ml-2'
        >
          {the_id}
        </div>
      </div>
    )
  }

  buildWorkbookName() {
    return (
      <div className='row ml-2 mt-3 bg-light'>
        <div
            className='d-inline'
        >
          Workbook Name: 
        </div>
        <div
            className='d-inline ml-2'
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
    )
  }

  buildPingButton() {
    return (
      <div className='d-inline'>
        <button
            className='btn btn-primary mt-2 ml-2'
            onClick={() => this.props.callPing()}
        >
          Ping
        </button>
      </div>
    )
  }

  buildGetVersionButton() {
    return (
      <div className='d-inline'>
        <button
            className='btn btn-primary mt-2 ml-2'
            onClick={() => this.props.callGetVersion()}
        >
          Get Api Version
        </button>
      </div>
    )
  }

  buildWorkbookSaveButton() {
    return (
      <div className='d-inline'>
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
      </div>
    )
  }

  buildRebaseMoviesButton() {
    return (
      <div className='d-inline'>
        <button
            className='btn btn-primary'
            onClick={() => this.props.submitInsightsJob('rebase_movies')}
        >
          Rebase Movies
        </button>
      </div>
    )
  }

  buildRebaseJobsButton() {
    return (
      <div className='d-inline ml-2'>
        <button
            className='btn btn-primary'
            onClick={() => this.props.submitInsightsJob('rebase_jobs')}
        >
          Rebase Jobs
        </button>
      </div>
    )
  }

  buildDeleteOldJobsButton() {
    return (
      <div className='d-inline'>
        <button
            className='btn btn-primary ml-2 mt-2'
            onClick={() => this.props.deleteOldJobs()}
        >
          Delete Old Jobs
        </button>
      </div>
    )
  }

  buildPingCvWorkerButton() {
    if (Object.keys(this.props.cv_workers).length === 0) {
      return ''
    }
    return (
      <div className='d-inline'>
        <button
            className='btn btn-primary ml-2 mt-2'
            onClick={() => this.props.submitInsightsJob('ping_cv_worker')}
        >
          Ping CV Worker
        </button>
      </div>
    )
  }

  buildSuLink() {
    return (
      <div className='d-inline p-0'>
        <button
            className='btn btn-link'
            onClick={() => this.props.setGlobalStateVar('user', {})}
        >
          shed user
        </button>
      </div>
    )
  }

  buildImpersonateLink() {
    return (
      <div>
        <div className='d-inline'>
          Impersonate User
        </div>
        <div className='d-inline ml-2'>
          <input 
              size='25'
              onChange={(event) => this.props.impersonateUser(event.target.value)}
          />
        </div>
      </div>
    )
  }

  buildPanelsCheckboxes() {
    let show_templates_checked = ''
    if (this.props.visibilityFlags['templates']) {
      show_templates_checked = 'checked'
    }
    let show_data_sifter_checked = ''
    if (this.props.visibilityFlags['data_sifter']) {
      show_data_sifter_checked = 'checked'
    }
    let show_hog_checked = ''
    if (this.props.visibilityFlags['hog']) {
      show_hog_checked = 'checked'
    }
    let show_selected_area_checked = ''
    if (this.props.visibilityFlags['selectedArea']) {
      show_selected_area_checked = 'checked'
    }
    let show_mesh_match_checked = ''
    if (this.props.visibilityFlags['mesh_match']) {
      show_mesh_match_checked = 'checked'
    }
    let show_selection_grower_checked = ''
    if (this.props.visibilityFlags['selection_grower']) {
      show_selection_grower_checked = 'checked'
    }
    let show_movie_sets_checked = ''
    if (this.props.visibilityFlags['movieSets']) {
      show_movie_sets_checked = 'checked'
    }
    let show_results_checked = ''
    if (this.props.visibilityFlags['results']) {
      show_results_checked = 'checked'
    }
    let show_filesystem_checked = ''
    if (this.props.visibilityFlags['filesystem']) {
      show_filesystem_checked = 'checked'
    }
    let show_annotate_checked = ''
    if (this.props.visibilityFlags['annotate']) {
      show_annotate_checked = 'checked'
    }
    let show_telemetry_checked = ''
    if (this.props.visibilityFlags['telemetry']) {
      show_telemetry_checked = 'checked'
    }
    let show_ocr_checked = ''
    if (this.props.visibilityFlags['ocr']) {
      show_ocr_checked = 'checked'
    }
    let show_ocr_scene_analysis_checked = ''
    if (this.props.visibilityFlags['ocr_scene_analysis']) {
      show_ocr_scene_analysis_checked = 'checked'
    }
    let show_ocr_movie_analysis_checked = ''
    if (this.props.visibilityFlags['ocr_movie_analysis']) {
      show_ocr_movie_analysis_checked = 'checked'
    }
    let show_diffs_checked = ''
    if (this.props.visibilityFlags['diffs']) {
      show_diffs_checked = 'checked'
    }
    let show_redact_checked = ''
    if (this.props.visibilityFlags['redact']) {
      show_redact_checked = 'checked'
    }
    let show_zip_checked = ''
    if (this.props.visibilityFlags['zip']) {
      show_zip_checked = 'checked'
    }
    let show_pipelines_checked = ''
    if (this.props.visibilityFlags['pipelines']) {
      show_pipelines_checked = 'checked'
    }

    return (
      <div>
        <div className='row mt-3 bg-light rounded'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={show_templates_checked}
            type='checkbox'
            onChange={() => this.props.toggleShowVisibility('templates')}
          />
          Show Templates
        </div>

        <div className='row mt-3 bg-light rounded'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={show_data_sifter_checked}
            type='checkbox'
            onChange={() => this.props.toggleShowVisibility('data_sifter')}
          />
          Show Data Sifter
        </div>

        <div className='row mt-3 bg-light rounded'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={show_hog_checked}
            type='checkbox'
            onChange={() => this.props.toggleShowVisibility('hog')}
          />
          Show Hog
        </div>

        <div className='row mt-3 bg-light rounded'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={show_selected_area_checked}
            type='checkbox'
            onChange={() => this.props.toggleShowVisibility('selectedArea')}
          />
          Show Selected Area
        </div>

        <div className='row mt-3 bg-light rounded'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={show_mesh_match_checked}
            type='checkbox'
            onChange={() => this.props.toggleShowVisibility('mesh_match')}
          />
          Show Mesh Match
        </div>

        <div className='row mt-3 bg-light rounded'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={show_selection_grower_checked}
            type='checkbox'
            onChange={() => this.props.toggleShowVisibility('selection_grower')}
          />
          Show Selection Grower
        </div>

        <div className='row mt-3 bg-light rounded'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={show_annotate_checked}
            type='checkbox'
            onChange={() => this.props.toggleShowVisibility('annotate')}
          />
          Show Annotate
        </div>

        <div className='row mt-3 bg-light rounded'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={show_telemetry_checked}
            type='checkbox'
            onChange={() => this.props.toggleShowVisibility('telemetry')}
          />
          Show Telemetry
        </div>

        <div className='row mt-3 bg-light rounded'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={show_ocr_checked}
            type='checkbox'
            onChange={() => this.props.toggleShowVisibility('ocr')}
          />
          Show Ocr
        </div>

        <div className='row mt-3 bg-light rounded'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={show_ocr_scene_analysis_checked}
            type='checkbox'
            onChange={() => this.props.toggleShowVisibility('ocr_scene_analysis')}
          />
          Show Ocr Scene Analysis
        </div>

        <div className='row mt-3 bg-light rounded'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={show_diffs_checked}
            type='checkbox'
            onChange={() => this.props.toggleShowVisibility('diffs')}
          />
          Show Diffs
        </div>

        <div className='row mt-3 bg-light rounded'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={show_redact_checked}
            type='checkbox'
            onChange={() => this.props.toggleShowVisibility('redact')}
          />
          Show Redact
        </div>

        <div className='row mt-3 bg-light rounded'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={show_zip_checked}
            type='checkbox'
            onChange={() => this.props.toggleShowVisibility('zip')}
          />
          Show Zip
        </div>

        <div className='row mt-3 bg-light rounded'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={show_movie_sets_checked}
            type='checkbox'
            onChange={() => this.props.toggleShowVisibility('movieSets')}
          />
          Show Movie Sets
        </div>

        <div className='row mt-3 bg-light rounded'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={show_results_checked}
            type='checkbox'
            onChange={() => this.props.toggleShowVisibility('results')}
          />
          Show Results
        </div>

        <div className='row mt-3 bg-light rounded'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={show_ocr_movie_analysis_checked}
            type='checkbox'
            onChange={() => this.props.toggleShowVisibility('ocr_movie_analysis')}
          />
          Show Ocr Movie Analysis
        </div>

        <div className='row mt-3 bg-light rounded'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={show_filesystem_checked}
            type='checkbox'
            onChange={() => this.props.toggleShowVisibility('filesystem')}
          />
          Show Filesystem
        </div>

        <div className='row mt-3 bg-light rounded'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={show_pipelines_checked}
            type='checkbox'
            onChange={() => this.props.toggleShowVisibility('pipelines')}
          />
          Show Pipelines
        </div>
      </div>
    )
  }

  buildFramesetDiscriminator() {
    const frameset_discriminator_select = buildFramesetDiscriminatorSelect(
      'frameset_discriminator',
      this.props.frameset_discriminator,
      (
        (event) => this.props.setGlobalStateVar(
          'frameset_discriminator', 
          event.target.value
        )
      )
    )

    return (
      <div className='row mt-3 bg-light rounded'>
        Frameset Discriminator
        <div
            className='d-inline ml-2'
        >   
          {frameset_discriminator_select}}
        </div>
      </div>
    )
  }

  addCvWorker() {
    if (!this.state.cv_worker_id) {
      this.props.displayInsightsMessage('cv_worker needs a unique id')
      return
    }
    let build_supported_operations = {}
    for (let i=0; i < this.state.cv_worker_supported_operations.length; i++) {
      const operation_key = this.state.cv_worker_supported_operations[i]
      build_supported_operations[operation_key] = {
        status: 'ACTIVE',
      }
    }
    const cv_worker_obj = {
      type: this.state.cv_worker_type,
      supported_operations: build_supported_operations,
    }
    let deepCopyCvWorkers = JSON.parse(JSON.stringify(this.props.cv_workers))
    deepCopyCvWorkers[this.state.cv_worker_id] = cv_worker_obj
    this.props.setGlobalStateVar('cv_workers', deepCopyCvWorkers)
    if (this.state.cv_worker_type === 'accepts_calls') {
      this.props.queryCvWorker(this.state.cv_worker_id)
    } 
  }

  deleteCvWorker(worker_key) {
    let deepCopyCvWorkers = JSON.parse(JSON.stringify(this.props.cv_workers))
    delete deepCopyCvWorkers[worker_key]
    this.props.setGlobalStateVar('cv_workers', deepCopyCvWorkers)
    this.props.displayInsightsMessage('cv_worker has been deleted')
  }

  updateCvWorkerSupportedOperations(value) {
    if (typeof value === 'string' || value instanceof String) {
      value = value.split('\n')
    }
    this.setLocalStateVar('cv_worker_supported_operations', value)
  }

  buildSupportedOperationsInput() {
    const supported_operations_string = this.state.cv_worker_supported_operations.join('\n')
    return (
      <div>
        <div className='d-inline'>
          Supported Operations
        </div>
        <div className='d-inline ml-2'>
          <textarea
             cols='80'
             rows='4'
             value={supported_operations_string}
             onChange={(event) => this.updateCvWorkerSupportedOperations(event.target.value)}
          />
        </div>
      </div>
    )
  }

  buildOneCvWorkerData(worker_url, index) {
    const cv_worker = this.props.cv_workers[worker_url]
    let operations = {}
    if (Object.keys(cv_worker).includes('operations')) {
      operations = cv_worker['operations']
    }
    return (
      <div className='col border-bottom' key={index}>
        <div className='row' key={index}>
          <div className='d-inline'>
            {worker_url}
          </div>
          <div className='d-inline'>
            <button
                onClick={()=>this.deleteCvWorker(worker_url)}
                className='ml-2 btn btn-link'
            >
              delete
            </button>
          </div>
        </div>
        <div className='row'>
          <div className='d-inline font-weight-bold'>
            Operations:
          </div>
          <div className='d-inline ml-2'>
            <ul>
              {Object.keys(operations).map((operation_name, op_index) => {
                const operation = operations[operation_name]
                return (
                  <ul key={op_index}>
                    <div className='d-inline' key={op_index}>
                      {operation_name}
                    </div>
                    <div className='d-inline ml-2'>
                      {operation.status}
                    </div>
                  </ul>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    )
  }

  buildCvWorkersArea() {
    const supported_operations_input = this.buildSupportedOperationsInput()
    return (
      <div className='col'>
        <div className='row'>
          <div className='d-inline'>
            Add CV Worker
          </div>
        </div>

        <div className='row'>
          <div className='d-inline'>
            <input 
                id='session_cv_worker'
                value={this.state.cv_worker_id}
                onChange={(event) => this.setLocalStateVar('cv_worker_id', event.target.value)}
                size='50'
            />
          </div>
          <div className='d-inline'>
            <button
                className='btn btn-primary'
                onClick={()=>this.addCvWorker()}
            >
              Add
            </button>
          </div>
        </div>

        <div className='row'>
          <div className='d-inline'>
            worker type
          </div>
          <div
              className='d-inline ml-2'
          >   
             <select
                value={this.state.cv_worker_type}
                onChange={(event) => this.setLocalStateVar('cv_worker_type', event.target.value)}
             >
              <option value='call_back'>call back</option>
              <option value='accepts_calls'>accepts calls from this system</option>
            </select>
          </div>
        </div>

        <div className='row'>
          {supported_operations_input}
        </div>

        <div className='row'>
          {Object.keys(this.props.cv_workers).map((worker_url, index) => {
            return this.buildOneCvWorkerData(worker_url, index)
          })}
        </div>
      </div>
    )
  }

  buildViewJobArea()  {
    return (
      <div>
        <div className='d-inline'>
          Show Job Results
        </div>
        <div className='d-inline ml-2'>
          <input
            size='40'
            id='session_job_id'
            value={this.state.job_id}
            onChange={(event) => this.setLocalStateVar('job_id', event.target.value)}
           />
        </div>
        <div className='d-inline ml-2'>
          <button
              className='btn btn-primary'
              onClick={()=>this.showJobResultsInModal()}
          >
            Show
          </button>
        </div>
      </div>
    )
  }

  showJobResultsInModal(job_id) {                                               
    if (!this.state.job_id) {
      return
    }
    this.props.getJobResultData(this.state.job_id, this.displayInNewTab)                   
  }                                                                             
                                                                                
  displayInNewTab(page_data) {                                                  
    var w = window.open('')                                                     
    w.document.write("<textarea style='width:100%;height:100%;'>")              
    w.document.write(page_data)                                                 
    w.document.write('</textarea>')                                             
  }                                                                             

  render() {
    const campaign_movies_box = this.buildCampaignMoviesBox()
    const update_state_box = this.buildGlobalStateBox()
    const cv_workers_area = this.buildCvWorkersArea()
    const workbook_load_button = this.buildWorkbookPickerButton()
    const workbook_delete_button = this.buildWorkbookDeleteButton()
    const workbook_name = this.buildWorkbookName()
    const workbook_id = this.buildWorkbookId()
    const show_hide_user = makePlusMinusRowLight('user', 'session_user_div')
    const show_hide_panels = makePlusMinusRowLight('panels', 'session_panels_div')
    const show_hide_data = makePlusMinusRowLight('data', 'session_data_div')
    const su_link = this.buildSuLink()
    const impersonate_link = this.buildImpersonateLink()
    const panels_checkboxes = this.buildPanelsCheckboxes() 
    const job_view_area = this.buildViewJobArea()

    let preserve_all_jobs_checked = ''
    if (this.props.preserveAllJobs) {
      preserve_all_jobs_checked = 'checked'
    }
    let preserve_movie_audio_checked = ''
    if (this.props.preserve_movie_audio) {
      preserve_movie_audio_checked = 'checked'
    }
    const when_done_selector = this.buildWhenDoneSelector()
    const ping_button = this.buildPingButton() 
    const get_version_button = this.buildGetVersionButton() 
    const workbook_save_button = this.buildWorkbookSaveButton()
    const rebase_movies_button = this.buildRebaseMoviesButton()
    const rebase_jobs_button = this.buildRebaseJobsButton()
    const ping_cv_worker_button = this.buildPingCvWorkerButton()
    const delete_old_jobs_button = this.buildDeleteOldJobsButton()
    const frameset_discriminator = this.buildFramesetDiscriminator()

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>
            <div className='row'>
              <div 
                className='col-lg-10 h3'
              > 
                session
              </div>
              <div className='col-lg-1 float-right'>
                <button
                    className='btn btn-link'
                    aria-expanded='false'
                    data-target='#session_body'
                    aria-controls='session_body'
                    data-toggle='collapse'
                    type='button'
                >
                  +/-
                </button>
              </div>
            </div>

            <div 
                id='session_body' 
                className='row collapse'
            >
              <div id='session_main' className='col'>

                <div className='row mt-3 bg-light rounded'>
                  {ping_button}
                  {get_version_button}
                  {ping_cv_worker_button}
                  {delete_old_jobs_button}

                  <div className='d-inline'>
                      {workbook_load_button}
                  </div>

                  <div className='d-inline'>
                      {workbook_delete_button}
                  </div>
                  {workbook_save_button}

                </div>

                <div className='mt-2'>
                  {rebase_movies_button}
                  {rebase_jobs_button}
                </div>

                {workbook_name}
                {workbook_id}
                {frameset_discriminator}

                <div className='row mt-3 bg-light rounded'>
                  {when_done_selector}
                </div>

                <div className='row mt-3 bg-light rounded'>
                  {job_view_area}
                </div>

                <div className='row mt-3 bg-light rounded'>
                  <input
                    className='ml-2 mr-2 mt-1'
                    id='toggle_preserve_all_jobs'
                    checked={preserve_all_jobs_checked}
                    type='checkbox'
                    onChange={() => this.props.toggleGlobalStateVar('preserveAllJobs')}
                  />
                  Preserve All Jobs (typically for troubleshooting)
                </div>

                <div className='row mt-3 bg-light rounded'>                     
                  <div className='d-inline'>                                    
                    Job Polling Interval (seconds):                             
                  </div>                                                        
                  <div className='d-inline ml-2'>                               
                    <input                                                      
                        id='session_job_polling_interval_seconds'               
                        value={this.props.job_polling_interval_seconds}         
                        onChange={(event) => this.props.setGlobalStateVar('job_polling_interval_seconds', event.target.value)}
                        size='5'                                                
                    />                                                          
                  </div>                                                        
                </div> 

                <div className='row mt-3 bg-light rounded'>
                  <input
                    className='ml-2 mr-2 mt-1'
                    id='toggle_preserve_movie_audio'
                    checked={preserve_movie_audio_checked}
                    type='checkbox'
                    onChange={(event) => this.props.toggleGlobalStateVar('preserve_movie_audio')}
                  />
                  Preserve Movie Audio
                </div>

                {show_hide_user}

                <div
                    id='session_user_div'
                    className='collapse'
                >
                  <div>
                    {su_link}
                  </div>
                  <div>
                    {impersonate_link}
                  </div>
                </div>

                {show_hide_panels}
                <div
                    id='session_panels_div'
                    className='collapse'
                >
                  {panels_checkboxes}
                </div>

                {show_hide_data}
                <div
                    id='session_data_div'
                    className='collapse'
                >
                  <div className='row mt-4'>
                    <div className='d-inline'>
                      <span className='h5'>Campaign Movies</span>
                      {campaign_movies_box}
                    </div>
                  </div>

                  <div className='row mt-4'>
                    <div className='d-inline'>
                      <span className='h5'>CV workers</span>
                      {cv_workers_area}
                    </div>
                  </div>

                  <div className='row mt-4'>
                    <div className='d-inline'>
                      <span className='h5'>Update Global State (paste json below)</span>
                      {update_state_box}
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

export default SessionControls;
