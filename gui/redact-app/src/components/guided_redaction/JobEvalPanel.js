import React from 'react';
import CanvasAnnotateOverlay from './CanvasAnnotateOverlay'
import {
  buildLabelAndDropdown,
} from './SharedControls'

class JobEvalPanel extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      mode: '',
      image_mode: '',
      annotate_view_mode: 'tile',
      annotate_movie_url: '',
      ocr_job_id: '',
      id: '',
      description: '',
      content: {},
      something_changed: false,
      job_eval_objectives: {},
    }
    this.setLocalStateVar = this.setLocalStateVar.bind(this)
    this.afterJeoSave = this.afterJeoSave.bind(this)
    this.loadJeo = this.loadJeo.bind(this)
    this.getJobEvalObjectives= this.getJobEvalObjectives.bind(this)
  }

  setImageMode(mode_name) {
    this.setState({
      image_mode: mode_name,
    })
  }

  annotateExemplarMovie(movie_url) {
    this.props.setActiveMovieFirstFrame(movie_url)
    this.setState({
      mode: 'annotate',
      annotate_movie_url: movie_url,
    })
  }

  afterJeoSave(response_obj) {
    let jeo_id = ''
    if (Object.keys(response_obj).includes('id')) {
      jeo_id = response_obj['id']
    }
    this.getJobEvalObjectives(
      (() => {this.loadJeo(jeo_id)})
    )
  }

  afterJeoDelete(response_obj) {
    this.getJobEvalObjectives()
  }

  getJeoFromState() {
    const jeo = {
      id: this.state.id,
      description: this.state.description,
      content: this.state.content,
    }
    return jeo
  }

  async getJobEvalObjectives(when_done=(()=>{})) {
    let the_url = this.props.getUrl('job_eval_objectives_url')
    await this.props.fetch(the_url, {
      method: 'GET',
      headers: this.props.buildJsonHeaders(),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      this.setState({
        'job_eval_objectives': responseJson,
       })
    })
    .then((responseJson) => {
      when_done(responseJson)
    })
    .catch((error) => {
      console.error(error);
    })
  }

  async saveJobEvalObjective(jeo_object, when_done=(()=>{})) {
    let the_url = this.props.getUrl('job_eval_objectives_url')
    const payload = jeo_object
    let response = await this.props.fetch(the_url, {
      method: 'POST',
      headers: this.props.buildJsonHeaders(),
      body: JSON.stringify(payload),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      when_done(responseJson)
    })
    .catch((error) => {
      console.error(error)
    })
    await response
  }

  async deleteJeo(jeo_id, when_done=(()=>{})) {
    let the_url = this.props.getUrl('job_eval_objectives_url')
    let response = await this.props.fetch(the_url + '/' + jeo_id, {
      method: 'DELETE',
      headers: this.props.buildJsonHeaders(),
    })
    .then((response) => {
      when_done(response)
    })
    .catch((error) => {
      console.error(error)
    })
    await response
  }

  loadJeo(jeo_id) {
    const jeo = this.state.job_eval_objectives[jeo_id]
    let content_obj = {}
    if (jeo.content) {
      content_obj = jeo.content
    }
    this.setState({
      id: jeo.id,
      description: jeo.description,
      content: content_obj,
    })
  }

  loadNewJeo() {
    this.setState({
      id: '',
      description: '',
      content: {
        permanent_standards: {},
      },
    })
  }

  buildJeoDeleteButton() {
    const jeo_keys = Object.keys(this.state.job_eval_objectives)
    return (
      <div className='d-inline'>
        <button
            key='jeo_delete_button'
            className='btn btn-primary ml-2 dropdown-toggle'
            type='button'
            id='arglebargle12'
            data-toggle='dropdown'
            area-haspopup='true'
            area-expanded='false'
        >
          Delete
        </button>
        <div className='dropdown-menu' aria-labelledby='arglebargle12'>
          {jeo_keys.map((jeo_key, index) => {
            const jeo = this.state.job_eval_objectives[jeo_key]
            const the_name = jeo['description']
            return (
              <button
                  className='dropdown-item'
                  key={index}
                  onClick={() => this.deleteJeo(jeo_key, (()=>{this.afterJeoDelete()}))}
              >
                {the_name}
              </button>
            )
          })}
        </div>
      </div>
    )
  }
  
  buildJeoLoadButton() {
    const jeo_keys = Object.keys(this.state.job_eval_objectives)
    return (
      <div className='d-inline'>
        <button
            key='jeo_load_button'
            className='btn btn-primary ml-2 dropdown-toggle'
            type='button'
            id='arglebargle123'
            data-toggle='dropdown'
            area-haspopup='true'
            area-expanded='false'
        >
          Load
        </button>
        <div className='dropdown-menu' aria-labelledby='arglebargle123'>
          {jeo_keys.map((jeo_key, index) => {
            const jeo = this.state.job_eval_objectives[jeo_key]
            const the_name = jeo['description']
            return (
              <button
                  className='dropdown-item'
                  key={index}
                  onClick={() => this.loadJeo(jeo_key)}
              >
                {the_name}
              </button>
            )
          })}
          <button
              className='dropdown-item'
              key='nada_surf'
              onClick={() => this.loadNewJeo()}
          >
            new
          </button>
        </div>
      </div>
    )
  }
  
  buildAddExemplarMovieButton() {
    return (
      <div className='d-inline'>
        <button
            key='add_exemplar_mov_button'
            className='btn btn-primary ml-2 dropdown-toggle'
            type='button'
            id='argle'
            data-toggle='dropdown'
            area-haspopup='true'
            area-expanded='false'
        >
          Add Movie
        </button>
        <div className='dropdown-menu' aria-labelledby='argle'>
          {Object.keys(this.props.movies).map((movie_url, index) => {
            const movie_name = movie_url.split('/').slice(-1)[0]
            if (
              this.state.content && 
              Object.keys(this.state.content).includes('permanent_standards') && 
              Object.keys(this.state.content['permanent_standards']).includes(movie_name)) {
              return ''
            }
            return (
              <button
                  className='dropdown-item'
                  key={index}
                  onClick={() => this.addExemplarMovie(movie_name, movie_url)}
              >
                {movie_name}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  removeExemplarMovie(movie_uuid) {
    let deepCopyContent = JSON.parse(JSON.stringify(this.state.content))
    if (Object.keys(deepCopyContent['permanent_standards']).includes(movie_uuid)) {
      delete deepCopyContent['permanent_standards'][movie_uuid]
      this.setLocalStateVar('content', deepCopyContent)
    }
  }

  addExemplarMovie(movie_name, movie_url) {
    let deepCopyContent = JSON.parse(JSON.stringify(this.state.content))
    deepCopyContent['permanent_standards'][movie_name] = {
      source_movie_url: movie_url,
      framesets: {},
    }
    this.setLocalStateVar('content', deepCopyContent)
  }

  buildJeoSaveButton() {
    if (!this.state.something_changed) {
      return ''
    }
    return (
      <button
          className='btn btn-primary'
          onClick={() => this.doSave()}
      >
        Save
      </button>
    )
  }

  setLocalStateVar(var_name, var_value, when_done=(()=>{})) {
    function anon_func() {
      when_done()
    }
    this.setState(
      {
        [var_name]: var_value,
        something_changed: true,
      },
      anon_func
    )
  }

  componentDidMount() {
    this.getJobEvalObjectives()
    this.loadNewJeo()
  }

  buildModeNav() {
    let targets = []
    targets = [{'': 'home'}, 
               {'review': 'review non-exemplar job'}, 
               {'compare': 'compare jobs'}
    ] 
    if (targets.length > 0) {
      return (
        <div className='row'>
          {targets.map((target_obj, index) => {
            const target_key = Object.keys(target_obj)[0]
            const target_display_text = target_obj[target_key]
            return (
              <div className='col-3' key={index}>
                <div className='row'>
                <button
                  className='btn btn-link'
                  onClick={() => {this.setState({'mode': target_key})}}
                >
                  {target_display_text}
                </button>
                </div>
              </div>
            )
          })}
        </div>
      )
    }
  }

  buildReviewPanel() {
    return (
      <div className='col'>
        <div className='row'>
          review stuff
        </div>
      </div>
    )
  }

  buildComparePanel() {
    return (
      <div className='col'>
        <div className='row'>
          compare stuff
        </div>
      </div>
    )
  }

  buildExemplarMoviesSection() {
    let perm_standards = {}
    if (this.state.content && Object.keys(this.state.content).includes('permanent_standards')) {
      perm_standards = this.state.content['permanent_standards']
    }
    return (
      <div className='row'>
        <div className='col'>
          {Object.keys(perm_standards).map((movie_uuid, index) => {
            const perm_standard = this.state.content['permanent_standards'][movie_uuid]
            const source_movie_url = perm_standard['source_movie_url']
            return (
              <div key={index} className='row'>
                <div className='col-4'>
                  {movie_uuid}
                </div>
                <div className='col-2'>
                  <button
                    className='btn btn-link ml-2 p-0'
                    onClick={()=>{this.annotateExemplarMovie(source_movie_url)}}
                  >
                    annotate
                  </button>
                </div>
                <div className='col-2'>
                  <button
                    className='btn btn-link ml-2 p-0'
                    onClick={()=>{this.removeExemplarMovie(movie_uuid)}}
                  >
                    delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  buildObjectivePanel() {
    const load_button = this.buildJeoLoadButton()
    const save_button = this.buildJeoSaveButton()
    const delete_button = this.buildJeoDeleteButton()

    return (
      <div className='col-9'>
        <div id='objective_div mt-2'>
          <div className='col'>
            <div className='row h3 border-top mt-4 pt-2'>
              <div className='col-4'>
                JEO General Info
              </div>
              <div className='col-2'>
                {load_button}
              </div>
              <div className='col-2'>
                {save_button}
              </div>
              <div className='col-2'>
                {delete_button}
              </div>
            </div>

            <div className='row ml-2'>
              <div className='d-inline'>
                Id: 
              </div>
              <div className='d-inline ml-2'>
                {this.state.id}
              </div>
            </div>

            <div className='row'>
              <div className='ml-2 mt-2'>
                <div>
                  Description:
                </div>
                <div
                    className='d-inline'
                >
                  <textarea
                    id='jeo_description'
                    cols='60'
                    rows='3'
                    value={this.state.description}
                    onChange={(event) => this.setLocalStateVar('description', event.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>


      </div>
    )
  }

  doSave(when_done=(()=>{})) {
    const jeo_object = this.getJeoFromState()
    this.saveJobEvalObjective(jeo_object, this.afterJeoSave)
  }

  buildHomePanel() {
    const objective_data = this.buildObjectivePanel()
    const exemplar_movies_section = this.buildExemplarMoviesSection()
    const add_button = this.buildAddExemplarMovieButton()
    return (
      <div className='col'>
        <div className='row mt-2'>
          {objective_data}
        </div>

        <div className='row mt-2'>
          <div className='col-6 h3'>
            Exemplar Movies
          </div>
          <div className='col-6'>
            {add_button}
          </div>
        </div>

        <div className='row'>
          <div className='col-12'>
            {exemplar_movies_section}
          </div>
        </div>
      </div>
    )
  }

  buildOcrMatchIdField() {
    let ocr_matches = []
    ocr_matches.push({'': ''})
    for (let i=0; i < this.props.jobs.length; i++) {
      const job = this.props.jobs[i]
      if (job['operation'] !== 'scan_ocr_threaded') {
        continue
      }
      const build_obj = {}
      const desc = job['description'] + ' ' + job['id'].slice(0,3) + '...'
      build_obj[job['id']] = desc
      ocr_matches.push(build_obj)
    }

    return buildLabelAndDropdown(
      ocr_matches,
      'Ocr Job Id',
      this.state.ocr_job_id,
      'ocr_job_id',
      ((value)=>{this.setLocalStateVar('ocr_job_id', value)})
    )
  }

  buildShowOcrButton() {
    if (!this.state.ocr_job_id) {
      return ''
    }
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.showOcrForFrame()}}
      >
        Show Ocr
      </button>
    )
  }

  buildHideOcrButton() {
    if (!this.state.ocr_job_id) {
      return ''
    }
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.hideOcrForFrame()}}
      >
        Hide Ocr
      </button>
    )
  }

  buildAddOcrButton() {
    if (!this.state.ocr_job_id) {
      return ''
    }
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.setImageMode('add_ocr')}}
      >
        Add Ocr
      </button>
    )
  }

  buildDeleteOcrButton() {
    if (!this.state.ocr_job_id) {
      return ''
    }
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.setImageMode('delete_ocr')}}
      >
        Delete Ocr
      </button>
    )
  }

  buildAddBoxButton() {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.setImageMode('add_box')}}
      >
        Add Box
      </button>
    )
  }

  buildDeleteBoxButton() {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.setImageMode('delete_box')}}
      >
        Delete Box
      </button>
    )
  }

  buildAnnotatePanel() {
    const ocr_id_field = this.buildOcrMatchIdField()
//          <CanvasAnnotateOverlay
//          />
    const add_box_button = this.buildAddBoxButton()
    const delete_box_button = this.buildDeleteBoxButton()
    const show_ocr_button = this.buildShowOcrButton()
    const hide_ocr_button = this.buildHideOcrButton()
    const add_ocr_button = this.buildAddOcrButton()
    const delete_ocr_button = this.buildDeleteOcrButton()
    return (
      <div className='col'>
        <div className='row mt-2'>
          annotating movie {this.state.annotate_movie_url}
        </div>

        <div className='row'>
          {ocr_id_field}
        </div>

        <div className='row'>
        IMAGE PANEL
        </div>

        <div className='row'>
          <div className='d-inline ml-1'>
            {add_box_button}
          </div>

          <div className='d-inline ml-1'>
            {delete_box_button}
          </div>

          <div className='d-inline ml-1'>
            {show_ocr_button}
          </div>

          <div className='d-inline ml-1'>
            {hide_ocr_button}
          </div>

          <div className='d-inline ml-1'>
            {add_ocr_button}
          </div>

          <div className='d-inline ml-1'>
            {delete_ocr_button}
          </div>

        </div>


      </div>
    )
  }

  showOcrForFrame() {
  console.log('showing ocr for frame')
  }

  hideOcrForFrame() {
  console.log('hiding ocr for frame')
  }

  render() {
    const mode_nav = this.buildModeNav()
    let title = 'Job Evaluation - Home'
    let page_content = ''
    if (!this.state.mode || this.state.mode === 'home') {
      page_content = this.buildHomePanel()
    } else if (this.state.mode === 'annotate') {
      page_content = this.buildAnnotatePanel()
      title = 'Job Eval - Annotate'
    } else if (this.state.mode === 'review') {
      page_content = this.buildReviewPanel()
      title = 'Job Eval - Review '
    } else if (this.state.mode === 'compare') {
      page_content = this.buildComparePanel()
      title = 'Job Eval - Compare'
    }
    return (
      <div className='col ml-2'>
        <div>
          {mode_nav}
        </div>
        <div className='row h2'>
          {title}
        </div>

        <div className='row'>
          {page_content}
        </div>
      </div>
    )
  }
}

export default JobEvalPanel;
