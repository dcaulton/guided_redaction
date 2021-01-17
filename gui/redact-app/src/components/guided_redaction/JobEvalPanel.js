import React from 'react';
import {
  getFileNameFromUrl
} from './redact_utils.js'
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
      exemplar_job_id: '',
      show_ocr: false,
      annotate_tile_column_count: 6,
      selected_frameset_hashes: [],
      clicked_coords: [],
      id: '',
      description: '',
      content: {},
      something_changed: false,
      job_eval_objectives: {},
      job_run_summaries: {},
      jrs_ids_to_compare: [],
    }
    this.setLocalStateVar=this.setLocalStateVar.bind(this)
    this.afterJeoSave=this.afterJeoSave.bind(this)
    this.loadJeo=this.loadJeo.bind(this)
    this.getJobEvalObjectives=this.getJobEvalObjectives.bind(this)
    this.handleImageClick=this.handleImageClick.bind(this)
    this.getOcrRegions=this.getOcrRegions.bind(this)
    this.getBoxes=this.getBoxes.bind(this)
    this.keyPress=this.keyPress.bind(this)
  }


  addRemoveToJrsIdsToCompare(jrs_id) {
    let build_ids = []
    let item_found = false
    for (let i=0; i < this.state.jrs_ids_to_compare.length; i++) {
      const existing_id = this.state.jrs_ids_to_compare[i]
      if (existing_id === jrs_id) {
        item_found = true
      } else {
        build_ids.push(existing_id)
      }
    }
    if (!item_found) {
      build_ids.push(jrs_id)
    }
    this.setState({
      jrs_ids_to_compare: build_ids,
    })
  }

  selectFramesetHash(fs_hash) {
    let deepCopySFH = JSON.parse(JSON.stringify(this.state.selected_frameset_hashes))
    let something_changed = false
    if (!this.state.selected_frameset_hashes.includes(fs_hash)) {
      deepCopySFH.push(fs_hash)
      something_changed = true
    } else {
      const cur_index = deepCopySFH.indexOf(fs_hash)
      deepCopySFH.splice(cur_index, 1)
      something_changed = true
    }
    if (something_changed) {
      this.setState({
        selected_frameset_hashes: deepCopySFH,
      })
    }
  }

  keyPress(event) {
    if (event.keyCode === 39) {
      this.gotoNextFrame()
    } else if (event.keyCode === 37) {
      this.gotoPrevFrame()
    }
  }

  frameHasAnnotationData(frameset_hash) {
    const movie_name = getFileNameFromUrl(this.state.annotate_movie_url)
    if (
      this.state.annotate_movie_url !== '' &&
      Object.keys(this.state.content['permanent_standards']).includes(movie_name) &&
      Object.keys(this.state.content['permanent_standards'][movie_name]['framesets']).includes(frameset_hash) &&
      Object.keys(this.state.content['permanent_standards'][movie_name]['framesets'][frameset_hash]).length > 0
    ) {
      return true
    }
  }

  getFirstFramesetHash(movie_url) {
    const the_movie = this.props.movies[movie_url]
    const first_frame_image_url = the_movie['frames'][0]
    let frameset_hash = this.props.getFramesetHashForImageUrl(first_frame_image_url, the_movie['framesets'])
    if (this.state.selected_frameset_hashes.length > 0) {
      let ordered_hashes = this.props.getFramesetHashesInOrder()
      let ordered_sf_hashes = []
      for (let i=0; i < ordered_hashes.length; i++) {
        const ith_hash = ordered_hashes[i]
        if (this.state.selected_frameset_hashes.includes(ith_hash)) {
          ordered_sf_hashes.push(ith_hash)
        }
      }
      frameset_hash = ordered_sf_hashes[0]
    }
    return frameset_hash
  }

  getFramePositionString() {
    const ordered_hashes = this.getFramesetHashesInOrder()
    const cur_index = ordered_hashes.indexOf(this.props.frameset_hash)
    return (cur_index + 1).toString() + '/' + ordered_hashes.length.toString()
  }

  getFramesetHashesInOrder() {
    let ordered_hashes = this.props.getFramesetHashesInOrder()
    if (this.state.selected_frameset_hashes.length > 0) {
      let ordered_sf_hashes = []
      for (let i=0; i < ordered_hashes.length; i++) {
        if (this.state.selected_frameset_hashes.includes(ordered_hashes[i])) {
          ordered_sf_hashes.push(ordered_hashes[i])
        }
      }
      ordered_hashes = ordered_sf_hashes
    }
    return ordered_hashes
  }

  gotoPrevFrame() {
    const ordered_hashes = this.getFramesetHashesInOrder()
    const cur_index = ordered_hashes.indexOf(this.props.frameset_hash)
    if (cur_index > 0) {
      const next_hash = ordered_hashes[cur_index-1]
      this.props.setFramesetHash(next_hash)
    }
  }

  gotoNextFrame() {
    const ordered_hashes = this.getFramesetHashesInOrder()
    const cur_index = ordered_hashes.indexOf(this.props.frameset_hash)
    if (cur_index < (ordered_hashes.length-1)) {
      const next_hash = ordered_hashes[cur_index+1]
      this.props.setFramesetHash(next_hash)
    }
  }

  getBoxes() {
    const perm_standard = this.state.content['permanent_standards']
    const movie_name = getFileNameFromUrl(this.state.annotate_movie_url)

    if (!Object.keys(perm_standard).includes(movie_name)) {
      return {}
    }
    if (!Object.keys(perm_standard[movie_name]['framesets']).includes(this.props.frameset_hash)) {
      return {}
    }
    const boxes = perm_standard[movie_name]['framesets'][this.props.frameset_hash]
    return boxes
  }

  getOcrRegions() {
 return {}
    if (!this.state.ocr_job_id || !this.state.show_ocr || !this.state.annotate_movie_url) {
      return {}
    }
    for (let i=0; i < Object.keys(this.props.tier_1_matches['ocr']).length; i++) {
      const match_key = Object.keys(this.props.tier_1_matches['ocr'])[i]
      const match_obj = this.props.tier_1_matches['ocr'][match_key]
      for (let j=0; j < Object.keys(match_obj['movies']).length; j++) {
        const match_movie_url = Object.keys(match_obj['movies'])[j]
        if (match_movie_url.includes(this.state.annotate_movie_url)) {
          const regions = match_obj['movies'][match_movie_url]
        }
      }
    }
    return {}
  }

  handleImageClick = (e) => {
    const x = e.nativeEvent.offsetX
    const y = e.nativeEvent.offsetY
    const imageEl = document.getElementById('annotate_image');
    const scale = (
      ((imageEl && imageEl.width) || 100) / ((imageEl && imageEl.naturalWidth) || 100)
    );
    const x_scaled = parseInt(x / scale)
    const y_scaled = parseInt(y / scale)
    if (x_scaled > this.state.image_width || y_scaled > this.state.image_height) {
        return
    }
    if (this.state.image_mode === 'add_ocr') {
      this.handleSetMode('add_ocr')
    } else if (this.state.image_mode === 'add_box_1') {
      this.setState({
        clicked_coords: [x_scaled, y_scaled],
        image_mode: 'add_box_2',
      })
    } else if (this.state.image_mode === 'add_box_2') {
      this.doAddBox2(x_scaled, y_scaled)
    } else if (this.state.image_mode === 'delete_box') {
      this.doDeleteBox(x_scaled, y_scaled)
    }
  }

  doDeleteBox(x_scaled, y_scaled) {
    let deepCopyContent = JSON.parse(JSON.stringify(this.state.content))
    let something_changed = false
    const movie_name = getFileNameFromUrl(this.state.annotate_movie_url)
    if (!Object.keys(deepCopyContent['permanent_standards']).includes(movie_name)) {
      return
    }
    if (!Object.keys(deepCopyContent['permanent_standards'][movie_name]['framesets']).includes(this.props.frameset_hash)) {
      return
    }
    const boxes_this_frame = this.state.content['permanent_standards'][movie_name]['framesets'][this.props.frameset_hash]
    for (let i=0; i < Object.keys(boxes_this_frame).length; i++) {
      const the_key = Object.keys(boxes_this_frame)[i]
      const the_box = boxes_this_frame[the_key]
      if (this.pointIsInBox([x_scaled, y_scaled], the_box['start'], the_box['end'])) {
        delete deepCopyContent['permanent_standards'][movie_name]['framesets'][this.props.frameset_hash][the_key]
        something_changed = true
      }
    }
    if (something_changed) {
      this.setState({
        content: deepCopyContent,
      })
    }
  }

  pointIsInBox(point_coords, box_start, box_end) {
    if (
      (box_start[0] <= point_coords[0]) &&
      (point_coords[0] <= box_end[0]) &&
      (box_start[1] <= point_coords[1]) &&
      (point_coords[1] <= box_end[1])) {
        return true
      }
  }

  doAddBox2(x_scaled, y_scaled) {
    const new_id = 'box_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    const new_box = {
      source: 'manual',
      start: this.state.clicked_coords,
      end: [x_scaled, y_scaled],
    }
    let deepCopyContent = JSON.parse(JSON.stringify(this.state.content))
    const movie_name = getFileNameFromUrl(this.state.annotate_movie_url)
    if (!Object.keys(deepCopyContent['permanent_standards']).includes(movie_name)) {
      deepCopyContent['permanent_standards'][movie_name] = {framesets: {}}
    }
    if (!Object.keys(deepCopyContent['permanent_standards'][movie_name]['framesets']).includes(this.props.frameset_hash)) {
      deepCopyContent['permanent_standards'][movie_name]['framesets'][this.props.frameset_hash] = {}
    }
    deepCopyContent['permanent_standards'][movie_name]['framesets'][this.props.frameset_hash][new_id] = new_box
    this.setState({
      clicked_coords: [x_scaled, y_scaled],
      image_mode: 'add_box_1',
      content: deepCopyContent,
      something_changed: true,
    })
  }

  setImageMode(mode_name) {
    this.setState({
      image_mode: mode_name,
    })
  }

  annotateExemplarMovie(movie_url, annotate_view_mode) {
    const fs_hash = this.getFirstFramesetHash(movie_url)
    this.props.setActiveMovieFirstFrame(movie_url, fs_hash)
    this.setState({
      mode: 'annotate',
      annotate_movie_url: movie_url,
      annotate_view_mode: annotate_view_mode,
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

  async getJobRunSummaries(when_done=(()=>{})) {
    let the_url = this.props.getUrl('job_run_summaries_url')
    await this.props.fetch(the_url, {
      method: 'GET',
      headers: this.props.buildJsonHeaders(),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      this.setState({
        'job_run_summaries': responseJson,
       })
    })
    .then((responseJson) => {
      when_done(responseJson)
    })
    .catch((error) => {
      console.error(error);
    })
  }

  async generateJobRunSummary(when_done=(()=>{})) {
    let the_url = this.props.getUrl('job_run_summaries_url')
    const payload = {
        job_id: this.state.exemplar_job_id,
        job_eval_objective_id: this.state.id,
    }
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
            const movie_name = getFileNameFromUrl(movie_url)
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
    this.getJobRunSummaries()
    this.loadNewJeo()
    window.addEventListener('keydown', this.keyPress)
  }

  buildModeNav() {
    let targets = []
    targets = [{'': 'home'}] 
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
                    onClick={()=>{this.annotateExemplarMovie(source_movie_url, 'tile')}}
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

            <div className='row'>
              <div className='d-inline ml-2'>
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
    const job_run_summary_section = this.buildJobRunSummarySection()
    return (
      <div className='col'>
        <div className='row mt-2'>
          {objective_data}
        </div>

        <div className='row mt-2'>
          <div className='col-6 h5'>
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

        <div className='row'>
          <div className='col-12'>
            {job_run_summary_section}
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

  buildAnnotateViewModeField() {
    const annotate_options = [
      {'single': 'single frame'},
      {'tile': 'show all frames'}
    ]
    return buildLabelAndDropdown(
      annotate_options,
      'Annotate View Mode',
      this.state.annotate_view_mode,
      'annotate_view_mode',
      ((value)=>{this.setLocalStateVar('annotate_view_mode', value)})
    )
  }

  buildShowOcrButton() {
    if (!this.state.ocr_job_id) {
      return ''
    }
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.setLocalStateVar('show_ocr', true)}}
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
        onClick={()=>{this.setLocalStateVar('show_ocr', false)}}
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
        onClick={()=>{this.setImageMode('add_box_1')}}
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

  buildImageElement(image_url) {
    if (image_url) {
      return (
        <img
            id='annotate_image'
            src={image_url}
            alt={image_url}
        />
      )
    } 
  }

  buildNextFrameButton() {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.gotoNextFrame()}}
      >
        Next
      </button>
    )
  }

  buildPrevFrameButton() {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.gotoPrevFrame()}}
      >
        Prev
      </button>
    )
  }

  buildBackToTileButton() {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.annotateExemplarMovie(this.state.annotate_movie_url, 'tile')}}
      >
        Back to Tile View
      </button>
    )
  }

  buildAnnotateTileColumnCountDropdown() {
    const annotate_options = [
      {'6': '6 columns'},
      {'4': '4 columns'},
      {'2': '2 columns'}
    ]
    return buildLabelAndDropdown(
      annotate_options,
      'Number of Columns',
      this.state.annotate_tile_column_count,
      'annotate_tile_column_count',
      ((value)=>{this.setState({'annotate_tile_column_count': value})})
    )
  }

  buildAnnotatePanelTile() {
    const num_cols = this.state.annotate_tile_column_count
    let col_class = 'col-2'
    if (num_cols === '6') {
      col_class = 'col-2'
    } else if (num_cols === '4') {
      col_class = 'col-3'
    } else if (num_cols === '2') {
      col_class = 'col-6'
    }
    const ordered_hashes = this.props.getFramesetHashesInOrder()
    const num_rows = Math.ceil(ordered_hashes.length / num_cols)
    const col_count_picker = this.buildAnnotateTileColumnCountDropdown()

    let row_num_array = []
    for (let i=0; i < num_rows; i++) {
      row_num_array.push(i)
    }

    const img_style = {
      width: '100%',
    }
    return (
      <div className='row'>
        <div className='col'>
          <div className='row h5'>
            <div className='col-9'>
              Select the frames you wish to annotate by clicking on them, press the Annotate button when done.  
              Clicking on no frames gives you all frames of the movie to annotate.
            </div>
            <div className='col-3'>
              <button
                className='btn btn-primary'
                onClick={()=>{this.annotateExemplarMovie(this.state.annotate_movie_url, 'single')}}
              >
                Annotate
              </button>
            </div>
          </div>
          <div className='row'>
            {col_count_picker}
          </div>
          {row_num_array.map((whatever, row_num) => {
            const start_point = row_num * num_cols 
            const end_point = start_point + num_cols
            const fs_hashes_this_row = ordered_hashes.slice(start_point, end_point)
            return (
              <div className='row pt-2 pr-2' key={row_num}>
                {fs_hashes_this_row.map((fs_hash, index) => {
                  let div_class = col_class
                  if (this.state.selected_frameset_hashes.includes(fs_hash)) {
                    div_class += ' active_card'
                  }
                  const img_url = this.props.getImageUrl(fs_hash)
                  let overlay_text = '.'
                  let overlay_style = {
                    color: 'white',
                  }
                  if (this.frameHasAnnotationData(fs_hash)) {
                    overlay_text = 'ANNOTATED'
                    overlay_style['color'] = '#000'
                  }
                  return (
                    <div 
                        className={div_class} 
                        key={index} 
                    >
                      <div
                        style={overlay_style}
                      >
                        {overlay_text}
                      </div>
                      <img
                        style={img_style}
                        src={img_url}
                        alt={img_url}
                        onClick={()=>{this.selectFramesetHash(fs_hash)}}
                      />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  buildAnnotatePanelSingle() {
    const add_box_button = this.buildAddBoxButton()
    const delete_box_button = this.buildDeleteBoxButton()
    const show_ocr_button = this.buildShowOcrButton()
    const hide_ocr_button = this.buildHideOcrButton()
    const add_ocr_button = this.buildAddOcrButton()
    const delete_ocr_button = this.buildDeleteOcrButton()
    const next_frame_button = this.buildNextFrameButton()
    const prev_frame_button = this.buildPrevFrameButton()
    const back_to_tile_button = this.buildBackToTileButton()
    const image_url = this.props.getImageUrl()
    const image_element = this.buildImageElement(image_url)
    return (
      <div className='row'>
        <div className='col'>
          <div id='annotate_image_div' className='row'>
            {image_element}
            <CanvasAnnotateOverlay
              image_width={this.props.image_width}
              image_height={this.props.image_height}
              image_scale={this.props.image_scale}
              image_url={image_url}
              mode={this.state.image_mode}
              clickCallback={this.handleImageClick}
              last_click={this.state.clicked_coords}
              getOcrRegions={this.getOcrRegions}
              getBoxes={this.getBoxes}
            />
          </div>

          <div className='row mt-2'>
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

            <div className='d-inline ml-1'>
              {prev_frame_button}
            </div>

            <div className='d-inline ml-1'>
              {next_frame_button}
            </div>

            <div className='d-inline ml-1'>
              {back_to_tile_button}
            </div>

          </div>
        </div>
      </div>
    )
  }

  buildAnnotatePanel() {
//    const ocr_id_field = this.buildOcrMatchIdField()
    const ocr_id_field = ''
//    const annotate_view_mode_field = this.buildAnnotateViewModeField()
    const annotate_view_mode_field = ''
    let the_body = ''
    let the_title = ''
    const movie_name = getFileNameFromUrl(this.state.annotate_movie_url)
    if (this.state.annotate_view_mode === 'single') {
      the_body = this.buildAnnotatePanelSingle()
      const image_url = this.props.getImageUrl()
      const image_name = getFileNameFromUrl(image_url)
      const position_string = this.getFramePositionString()
      the_title = movie_name + ', ' + image_name + ' - ' +position_string
    } else if (this.state.annotate_view_mode === 'tile') {
      the_body = this.buildAnnotatePanelTile()
      the_title = movie_name 
    }

    return (
      <div className='col'>
        <div className='row mt-2 h4'>
          {the_title}
        </div>

        <div className='row'>
          {ocr_id_field}
        </div>

        <div className='row'>
          {annotate_view_mode_field}
        </div>

        {the_body}

      </div>
    )
  }

  buildGenerateExemplarJrsLine() {
    const jobs = [{'': ''}]
    for (let i=0; i < this.props.jobs.length; i++) {
      const job = this.props.jobs[i]
      const build_obj = {}
      build_obj[job.id] = job.id.substring(0, 5) + '... - ' + job.description
      jobs.push(build_obj)
    }

    const job_id_dropdown = buildLabelAndDropdown(
      jobs,
      'Job Id',
      this.state.exemplar_job_id,
      'exemplar_job_id',
      ((value)=>{this.setLocalStateVar('exemplar_job_id', value)})
    )
    return (
      <div>
        <div className='d-inline'>
          {job_id_dropdown}
        </div>
      </div>
    )
  }

  buildGenerateExemplarJrsButton() {
    if (!this.state.id || !this.state.exemplar_job_id) {
      return ''
    }

    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.generateJobRunSummary()}}
      >
        Generate Exemplar JRS
      </button>
    )
  }

  buildCompareButton() {
    if (this.state.jrs_ids_to_compare.length < 2) {
      return ''
    }

    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.startCompare()}}
      >
        Compare
      </button>
    )
  }

  startCompare() {
    this.setState({
        mode: 'compare',
    })
  }

  buildManualJrsButton() {
    if (!this.state.id || !this.state.exemplar_job_id) {
      return ''
    }

    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.startReview()}}
      >
        Build Manual JRS
      </button>
    )
  }

  startReview() {
    this.setState({
        mode: 'review',
    })
  }

  buildJobRunSummaryList() {
    if (!this.state.job_run_summaries || Object.keys(this.state.job_run_summaries).length === 0) {
      return ''
    }
    if (!this.state.id) {
      return ''
    }
    return (
      <div className='col'>
        {Object.keys(this.state.job_run_summaries).map((jrs_key, index) => {
          const jrs = this.state.job_run_summaries[jrs_key]
          if (jrs.job_eval_objective_id !== this.state.id) {
            return ''
          }
          let its_checked = false
          if (this.state.jrs_ids_to_compare.includes(jrs_key)) {
            its_checked = true
          }
          return (
            <div 
              key={index}
              className='row'
            >
              <div className='col-4'>
                {jrs_key}
              </div>
              <div className='col-1'>
                <input
                  className='ml-2 mr-2 mt-1'
                  checked={its_checked}
                  type='checkbox'
                  onChange={
                    () => this.addRemoveToJrsIdsToCompare(jrs_key) 
                  }
                />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  buildJobRunSummarySection() {
    const exemplar_job_picker = this.buildGenerateExemplarJrsLine()
    const generate_exemplar_button = this.buildGenerateExemplarJrsButton()
    const manual_review_button = this.buildManualJrsButton()
    const jrs_list = this.buildJobRunSummaryList()
    const compare_button = this.buildCompareButton()
    return (
      <div className='row border-top'>
        <div className='col'>
          <div className='row h3'>
            Job Run Summaries
          </div>

          <div className='row mt-4 h4'>
            Generate Summaries
          </div>
          <div className='row mt-4'>
            {exemplar_job_picker}
          </div>

          <div className='row'>
            <div className='d-inline ml-2'>
              {generate_exemplar_button}
            </div>
            <div className='d-inline ml-2'>
              {manual_review_button}
            </div>
          </div>

          <div className='row mt-4 h4'>
            Compare Jobs
          </div>
          <div className='row'>
            {jrs_list}
          </div>
          <div className='row'>
            {compare_button}
          </div>

        </div>
      </div>
    )
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
