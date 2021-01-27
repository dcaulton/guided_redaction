import React from 'react';
import {
  getFileNameFromUrl
} from './redact_utils.js'
import CanvasAnnotateOverlay from './CanvasAnnotateOverlay'
import {
  buildLabelAndTextInput,
  buildLabelAndDropdown,
} from './SharedControls'

class JobEvalPanel extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      mode: '',
      message: '',
      image_mode: '',
      compare_single_mode_data: {},
      image_scale: 1,
      annotate_view_mode: 'tile',
      active_movie_url: '',
      ocr_job_id: '',
      active_job_id: '',
      active_t1_results_key: '',
      active_t1_scanner_type: '',
      show_ocr: false,
      annotate_tile_column_count: 6,
      selected_frameset_hashes: [],
      clicked_coords: [],
      jeo_id: '',
      jeo_description: '',
      jeo_permanent_standards: {},
      jeo_weight_true_pos: 1,
      jeo_weight_false_pos: 1,
      jeo_weight_true_neg: 1,
      jeo_weight_false_neg: 1,
      jeo_frame_passing_score: 70,
      jeo_movie_passing_score: 70,
      jeo_max_num_failed_frames: 10,
      jeo_hard_fail_from_any_frame: false,
      jeo_preserve_job_run_parameters: true,
      jeo_preserve_truth_maps: true,
      something_changed: false,
      job_eval_objectives: {},
      job_run_summaries: {},
      jrs_ids_to_compare: [],
      jrs_ids_to_delete: [],
      jrs_movies: {},
    }
    this.setLocalStateVar=this.setLocalStateVar.bind(this)
    this.afterJeoSave=this.afterJeoSave.bind(this)
    this.loadJeo=this.loadJeo.bind(this)
    this.getJobEvalObjectives=this.getJobEvalObjectives.bind(this)
    this.handleImageClick=this.handleImageClick.bind(this)
    this.getOcrRegions=this.getOcrRegions.bind(this)
    this.getPermanentStandardBoxes=this.getPermanentStandardBoxes.bind(this)
    this.getDesiredBoxes=this.getDesiredBoxes.bind(this)
    this.getUnwantedBoxes=this.getUnwantedBoxes.bind(this)
    this.keyPress=this.keyPress.bind(this)
    this.getT1MatchBoxes=this.getT1MatchBoxes.bind(this)
    this.setImageScale=this.setImageScale.bind(this)
    this.setMessage=this.setMessage.bind(this)
  }

// TODO GET THIS INTEGRATED WITH IMAGE CLICK OR SOMETHING, WE"RE STUCK AT 1 UNTIL THEN
  setImageScale() {
    if (!document.getElementById('job_eval_image')) {
      return
    }
    const scale = (document.getElementById('job_eval_image').width /
        document.getElementById('job_eval_image').naturalWidth)
console.log("mingo scale is "+scale.toString())
    this.setState({
      'image_scale': scale,
    })
  }

  setMessage(the_message) {
    this.setState({
      message: the_message,
    })
  }

  buildManualJrsJobData(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'job_run_summaries'
    job_data['operation'] = 'create_manual_jrs'
    job_data['description'] = 'create manual jrs for job '+this.state.active_job_id
    job_data['request_data']['job_id'] = this.state.active_job_id
    job_data['request_data']['job_eval_objective_id'] = this.state.jeo_id
    job_data['request_data']['jrs_movies'] = this.state.jrs_movies
    return job_data
  }

  submitJobEvalJob(job_string, extra_data = '') {
    if (job_string === 'build_manual_job_run_summary') {
      const job_data = this.buildManualJrsJobData(extra_data)
      this.props.submitJob({
        job_data:job_data,
        after_submit: ((r) => {this.setMessage('build manual job run summary task has been submitted')}),
        delete_job_after_loading: true,
        attach_to_job: false,
        after_loaded: () => {this.getJobEvalObjectives()},
        when_failed: () => {this.setMessage('build manual job run summary failed')},
      })
    }
  }


  buildPreserveTruthMapsField() {
    let checked_value = ''
    if (this.state.jeo_preserve_truth_maps) {
      checked_value = 'checked'
    }
    return (
      <div>
        <div className='d-inline'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={checked_value}
            type='checkbox'
            onChange={() => this.setLocalStateVar('jeo_preserve_truth_maps', !this.state.jeo_preserve_truth_maps)}
          />
        </div>
        <div className='d-inline'>
          Preserve Truth Maps
        </div>
      </div>
    )
  }

  buildPreserveJobRunParametersField() {
    let checked_value = ''
    if (this.state.jeo_preserve_job_run_parameters) {
      checked_value = 'checked'
    }
    return (
      <div>
        <div className='d-inline'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={checked_value}
            type='checkbox'
            onChange={() => this.setLocalStateVar('jeo_preserve_job_run_parameters', !this.state.jeo_preserve_job_run_parameters)}
          />
        </div>
        <div className='d-inline'>
          Preserve Job Run Parameters
        </div>
      </div>
    )
  }

  buildHardFailAnyFrameField() {
    let checked_value = ''
    if (this.state.jeo_hard_fail_from_any_frame) {
      checked_value = 'checked'
    }
    return (
      <div>
        <div className='d-inline'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={checked_value}
            type='checkbox'
            onChange={() => this.setLocalStateVar('jeo_hard_fail_from_any_frame', !this.state.jeo_hard_fail_from_any_frame)}
          />
        </div>
        <div className='d-inline'>
          Hard Fail Any Frame
        </div>
      </div>
    )
  }

  buildJeoFramePassingScoreField() {
    return buildLabelAndTextInput(
      this.state.jeo_frame_passing_score,
      'Frame Passing Score (0-100)',
      'jeo_frame_passing_score',
      'jeo_frame_passing_score',
      4,
      ((value)=>{this.setLocalStateVar('jeo_frame_passing_score', value)})
    )
  }

  buildJeoMoviePassingScoreField() {
    return buildLabelAndTextInput(
      this.state.jeo_movie_passing_score,
      'Movie Passing Score (0-100)',
      'jeo_movie_passing_score',
      'jeo_movie_passing_score',
      4,
      ((value)=>{this.setLocalStateVar('jeo_movie_passing_score', value)})
    )
  }

  buildJeoMaxNumFailedFramesField() {
    return buildLabelAndTextInput(
      this.state.jeo_max_num_failed_frames,
      'Max Num of Failed Frames',
      'jeo_max_num_failed_frames',
      'jeo_max_num_failed_frames',
      4,
      ((value)=>{this.setLocalStateVar('jeo_max_num_failed_frames', value)})
    )
  }

  buildJeoWeightTruePosField() {
    return buildLabelAndTextInput(
      this.state.jeo_weight_true_pos,
      'True Positive',
      'jeo_weight_true_pos',
      'jeo_weight_true_pos',
      4,
      ((value)=>{this.setLocalStateVar('jeo_weight_true_pos', value)})
    )
  }

  buildJeoWeightTrueNegField() {
    return buildLabelAndTextInput(
      this.state.jeo_weight_true_neg,
      'True Negative',
      'jeo_weight_true_neg',
      'jeo_weight_true_neg',
      4,
      ((value)=>{this.setLocalStateVar('jeo_weight_true_neg', value)})
    )
  }

  buildJeoWeightFalsePosField() {
    return buildLabelAndTextInput(
      this.state.jeo_weight_false_pos,
      'False Positive',
      'jeo_weight_false_pos',
      'jeo_weight_false_pos',
      4,
      ((value)=>{this.setLocalStateVar('jeo_weight_false_pos', value)})
    )
  }

  buildJeoWeightFalseNegField() {
    return buildLabelAndTextInput(
      this.state.jeo_weight_false_neg,
      'False Negative',
      'jeo_weight_false_neg',
      'jeo_weight_false_neg',
      4,
      ((value)=>{this.setLocalStateVar('jeo_weight_false_neg', value)})
    )
  }

  frameHasT1Data(frameset_hash) {
    if (this.state.mode === 'review' && this.state.active_t1_results_key) {
      const match_obj = this.props.tier_1_matches[this.state.active_t1_scanner_type][this.state.active_t1_results_key]
      const movie_url = this.state.active_movie_url
      if (
        movie_url !== '' &&
        Object.keys(match_obj['movies']).includes(movie_url) &&
        Object.keys(match_obj['movies'][movie_url]['framesets']).includes(frameset_hash) &&
        Object.keys(match_obj['movies'][movie_url]['framesets'][frameset_hash]).length > 0
      ) {
        return true
      }
    }
  }

  getDesiredBoxes() {
    return this.getDesiredOrUnwantedBoxes('desired')
  }

  getUnwantedBoxes() {
    return this.getDesiredOrUnwantedBoxes('unwanted')
  }

  getDesiredOrUnwantedBoxes(box_type='desired') {
    if (this.state.mode !== 'review') {
      return {}
    }
    const movie_url = this.state.active_movie_url
    const fsh = this.props.frameset_hash
    const jrs_movies = this.state.jrs_movies
    if (!Object.keys(jrs_movies).includes(movie_url)) {
      return {}
    }
    if (!Object.keys(jrs_movies[movie_url]['framesets']).includes(fsh)) {
      return {}
    }
    if (!Object.keys(jrs_movies[movie_url]['framesets'][fsh]).includes(box_type)) {
      return {}
    }
    const items = jrs_movies[movie_url]['framesets'][fsh][box_type]
    return items
  }

  getT1MatchBoxes() {
    if (this.state.mode === 'review' && this.state.active_t1_results_key) {
      const match_obj = this.props.tier_1_matches[this.state.active_t1_scanner_type][this.state.active_t1_results_key]
      if (
        Object.keys(match_obj).includes('movies') &&
        Object.keys(match_obj['movies']).includes(this.state.active_movie_url)
      ) {
        const this_movies_matches = match_obj['movies'][this.state.active_movie_url]
        if (Object.keys(this_movies_matches['framesets']).includes(this.props.frameset_hash)) {
          const ret_val = this_movies_matches['framesets'][this.props.frameset_hash]
          return ret_val
        }
      }
    }
    return {}
  }

  jobHasMatchForExemplarMovie() {
    if (!this.state.jeo_id || !this.state.active_job_id) {
      return false
    }
    let match_obj = {}
    for (let i=0; i < Object.keys(this.props.tier_1_matches).length; i++) {
      const scanner_type = Object.keys(this.props.tier_1_matches)[i]
      for (let j=0; j < Object.keys(this.props.tier_1_matches[scanner_type]).length; j++) {
        const match_key = Object.keys(this.props.tier_1_matches[scanner_type])[j]
        if (this.props.tier_1_matches[scanner_type][match_key]['job_id'] === this.state.active_job_id) {
          match_obj = this.props.tier_1_matches[scanner_type][match_key]
          break
        }
      }
    }
    if (Object.keys(match_obj).length === 0) {
      return false
    }
    const match_movie_urls = Object.keys(match_obj['movies'])
    for (let i=0; i < Object.keys(this.state.jeo_permanent_standards).length; i++) {
      const movie_name = Object.keys(this.state.jeo_permanent_standards)[i]
      for (let j=0; j < match_movie_urls.length; j++) {
        if (match_movie_urls[j].includes(movie_name)) {
          return true
        }
      }
    }
  }

  deleteJrsMovie(movie_url) {
    if (Object.keys(this.state.jrs_movies).includes(movie_url)) {
      let deepCopyJrsm = JSON.parse(JSON.stringify(this.state.jrs_movies))
      delete deepCopyJrsm[movie_url]
      this.setState({
        jrs_movies: deepCopyJrsm,
      })
    }
  }

  addRemoveToJrsIdsToDelete(jrs_id) {
    let build_ids = []
    let item_found = false
    for (let i=0; i < this.state.jrs_ids_to_delete.length; i++) {
      const existing_id = this.state.jrs_ids_to_delete[i]
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
      jrs_ids_to_delete: build_ids,
    })
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

  getFramesetReviewDisplayString(fs_hash) {
    const movie_url = this.state.active_movie_url
    if (
      movie_url !== '' &&
      Object.keys(this.state.jrs_movies).includes(movie_url) &&
      Object.keys(this.state.jrs_movies[movie_url]['framesets']).includes(fs_hash) &&
      Object.keys(this.state.jrs_movies[movie_url]['framesets'][fs_hash]).length > 0
    ) {
      const review_obj = this.state.jrs_movies[movie_url]['framesets'][fs_hash]
      if (review_obj['pass_or_fail'] === 'pass') {
        return 'PASSED'
      } else if (review_obj['pass_or_fail'] === 'fail') {
        return 'FAILED'
      } else {
        return 'REVIEWED'
      } 
      return '.'
    }
  }

  frameHasAnnotationData(frameset_hash) {
    const movie_name = getFileNameFromUrl(this.state.active_movie_url)
    if (
      this.state.active_movie_url !== '' &&
      Object.keys(this.state.jeo_permanent_standards).includes(movie_name) &&
      Object.keys(this.state.jeo_permanent_standards[movie_name]['framesets']).includes(frameset_hash) &&
      Object.keys(this.state.jeo_permanent_standards[movie_name]['framesets'][frameset_hash]).length > 0
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

  getPermanentStandardBoxes() {
    if (this.state.mode !== 'annotate') {
      return {}
    }
    const perm_standard = this.state.jeo_permanent_standards
    const movie_name = getFileNameFromUrl(this.state.active_movie_url)

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
    if (!this.state.ocr_job_id || !this.state.show_ocr || !this.state.active_movie_url) {
      return {}
    }
    for (let i=0; i < Object.keys(this.props.tier_1_matches['ocr']).length; i++) {
      const match_key = Object.keys(this.props.tier_1_matches['ocr'])[i]
      const match_obj = this.props.tier_1_matches['ocr'][match_key]
      for (let j=0; j < Object.keys(match_obj['movies']).length; j++) {
        const match_movie_url = Object.keys(match_obj['movies'])[j]
        if (match_movie_url.includes(this.state.active_movie_url)) {
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
    } else if (this.state.image_mode === 'add_permanent_standard_box_1') {
      this.saveCoordsAndSetImageMode(x_scaled, y_scaled, 'add_permanent_standard_box_2')
    } else if (this.state.image_mode === 'add_desired_box_1') {
      this.saveCoordsAndSetImageMode(x_scaled, y_scaled, 'add_desired_box_2')
    } else if (this.state.image_mode === 'add_unwanted_box_1') {
      this.saveCoordsAndSetImageMode(x_scaled, y_scaled, 'add_unwanted_box_2')
    } else if (this.state.image_mode === 'add_permanent_standard_box_2') {
      this.doAddPermanentStandardBox2(x_scaled, y_scaled)
    } else if (this.state.image_mode === 'add_desired_box_2') {
      this.doAddDesiredBox2(x_scaled, y_scaled)
    } else if (this.state.image_mode === 'add_unwanted_box_2') {
      this.doAddUnwantedBox2(x_scaled, y_scaled)
    } else if (this.state.image_mode === 'delete_box') {
      this.doDeleteBox(x_scaled, y_scaled)
    }
  }

  saveCoordsAndSetImageMode(x_scaled, y_scaled, image_mode) {
    this.setState({
      clicked_coords: [x_scaled, y_scaled],
      image_mode: image_mode,
    })
  }

  doDeleteBox(x_scaled, y_scaled) {
    let deepCopyPs= JSON.parse(JSON.stringify(this.state.jeo_permanent_standards))
    let something_changed = false
    const movie_name = getFileNameFromUrl(this.state.active_movie_url)
    if (!Object.keys(deepCopyPs).includes(movie_name)) {
      return
    }
    if (!Object.keys(deepCopyPs[movie_name]['framesets']).includes(this.props.frameset_hash)) {
      return
    }
    const boxes_this_frame = this.state.jeo_permanent_standards[movie_name]['framesets'][this.props.frameset_hash]
    for (let i=0; i < Object.keys(boxes_this_frame).length; i++) {
      const the_key = Object.keys(boxes_this_frame)[i]
      const the_box = boxes_this_frame[the_key]
      if (this.pointIsInBox([x_scaled, y_scaled], the_box['start'], the_box['end'])) {
        delete deepCopyPs[movie_name]['framesets'][this.props.frameset_hash][the_key]
        something_changed = true
      }
    }
    if (something_changed) {
      this.setState({
        jeo_permanent_standards: deepCopyPs,
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

  doAddUnwantedBox2(x_scaled, y_scaled) {
    return this.doAddDesiredUnwantedBox2(x_scaled, y_scaled, 'unwanted')
  }

  doAddDesiredBox2(x_scaled, y_scaled) {
    return this.doAddDesiredUnwantedBox2(x_scaled, y_scaled, 'desired')
  }

  doAddDesiredUnwantedBox2(x_scaled, y_scaled, box_type) {
    let new_mode = 'add_desired_box_1'
    if (box_type === 'unwanted') {
      new_mode = 'add_unwanted_box_1'
    }
    const new_id = 'box_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    const new_box = {
      source: 'manual',
      start: this.state.clicked_coords,
      end: [x_scaled, y_scaled],
    }
    let deepCopyJrsm = JSON.parse(JSON.stringify(this.state.jrs_movies))
    const fsh = this.props.frameset_hash
    if (!Object.keys(this.state.jrs_movies[this.state.active_movie_url]['framesets']).includes(fsh)) {
      deepCopyJrsm[this.state.active_movie_url]['framesets'][fsh] = {
        desired: {},
        unwanted: {},
        pass_or_fail: '',
      }
    }
    deepCopyJrsm[this.state.active_movie_url]['framesets'][fsh][box_type][new_id] = new_box
    this.setState({
      jrs_movies: deepCopyJrsm,
      image_mode: new_mode,
    })
  }

  markFrameAsPassed() {
    this.markFrameAsPassedOrFailed('pass')
  }

  markFrameAsFailed() {
    this.markFrameAsPassedOrFailed('fail')
  }

  markFrameAsPassedOrFailed(pass_or_fail) {
    let deepCopyJrsm = JSON.parse(JSON.stringify(this.state.jrs_movies))
    const fsh = this.props.frameset_hash
    if (!Object.keys(this.state.jrs_movies[this.state.active_movie_url]['framesets']).includes(fsh)) {
      deepCopyJrsm[this.state.active_movie_url]['framesets'][fsh] = {
        desired: {},
        unwanted: {},
        pass_or_fail: '',
      }
    }
    deepCopyJrsm[this.state.active_movie_url]['framesets'][fsh]['desired'] = {}
    deepCopyJrsm[this.state.active_movie_url]['framesets'][fsh]['unwanted'] = {}
    deepCopyJrsm[this.state.active_movie_url]['framesets'][fsh]['pass_or_fail'] = pass_or_fail
    this.setState({
      jrs_movies: deepCopyJrsm,
    })
  }

  doAddPermanentStandardBox2(x_scaled, y_scaled) {
    const new_id = 'box_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    const new_box = {
      source: 'manual',
      start: this.state.clicked_coords,
      end: [x_scaled, y_scaled],
    }
    let deepCopyPs = JSON.parse(JSON.stringify(this.state.jeo_permanent_standards))
    const movie_name = getFileNameFromUrl(this.state.active_movie_url)
    if (!Object.keys(deepCopyPs).includes(movie_name)) {
      deepCopyPs[movie_name] = {framesets: {}}
    }
    if (!Object.keys(deepCopyPs[movie_name]['framesets']).includes(this.props.frameset_hash)) {
      deepCopyPs[movie_name]['framesets'][this.props.frameset_hash] = {}
    }
    deepCopyPs[movie_name]['framesets'][this.props.frameset_hash][new_id] = new_box
    this.setState({
      clicked_coords: [x_scaled, y_scaled],
      image_mode: 'add_permanent_standard_box_1',
      jeo_permanent_standards: deepCopyPs,
      something_changed: true,
    })
  }

  setImageMode(mode_name) {
    this.setState({
      image_mode: mode_name,
    })
  }

  annotateExemplarMovie(movie_url, annotate_view_mode) {
    if (!Object.keys(this.props.movies).includes(movie_url)) {
      this.setState({'message': 'error: campaign movie not loaded'})
      return
    }
    const fs_hash = this.getFirstFramesetHash(movie_url)
    this.props.setActiveMovieFirstFrame(movie_url, fs_hash)
    this.setState({
      mode: 'annotate',
      active_movie_url: movie_url,
      annotate_view_mode: annotate_view_mode,
    })
  }

  reviewExemplarMovie(movie_url, annotate_view_mode) {
    const fs_hash = this.getFirstFramesetHash(movie_url)
    this.props.setActiveMovieFirstFrame(movie_url, fs_hash)
    this.setState({
      mode: 'review',
      active_movie_url: movie_url,
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
    const build_content = {
      weight_true_pos: this.state.jeo_weight_true_pos,
      weight_false_pos: this.state.jeo_weight_false_pos,
      weight_true_neg: this.state.jeo_weight_true_neg,
      weight_false_neg: this.state.jeo_weight_false_neg,
      frame_passing_score: this.state.jeo_frame_passing_score,
      movie_passing_score: this.state.jeo_movie_passing_score,
      max_num_failed_frames: this.state.jeo_max_num_failed_frames,
      hard_fail_from_any_frame: this.state.jeo_hard_fail_from_any_frame,
      preserve_job_run_parameters: this.state.jeo_preserve_job_run_parameters,
      preserve_truth_maps: this.state.jeo_preserve_truth_maps,
      permanent_standards: this.state.jeo_permanent_standards,
    }
    const jeo = {
      id: this.state.jeo_id,
      description: this.state.jeo_description,
      content: build_content,
    }
    return jeo
  }

  async deleteJrsRecords() {
    for (let i=0; i < this.state.jrs_ids_to_delete.length; i++) {
      const jrs_id = this.state.jrs_ids_to_delete[i]
      this.deleteJobRunSummary(jrs_id, (()=>{this.getJobRunSummaries()}))
    }
  }

  async deleteJobRunSummary(jrs_id, when_done=(()=>{})) {
    let the_url = this.props.getUrl('job_run_summaries_url') + '/' + jrs_id
    await this.props.fetch(the_url, {
      method: 'DELETE',
      headers: this.props.buildJsonHeaders(),
    })
    .then((response) => {
      when_done(response)
    })
    .catch((error) => {
      console.error(error);
    })
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
    let the_url = this.props.getUrl('job_run_summaries_url') + '/generate'
    const payload = {
        job_id: this.state.active_job_id,
        job_eval_objective_id: this.state.jeo_id,
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
    this.setState({
      jeo_id: jeo.id,
      jeo_description: jeo.description,
      jeo_weight_true_pos: jeo.content.weight_true_pos,
      jeo_weight_false_pos: jeo.content.weight_false_pos,
      jeo_weight_true_neg: jeo.content.weight_true_neg,
      jeo_weight_false_neg: jeo.content.weight_false_neg,
      jeo_frame_passing_score: jeo.content.frame_passing_score,
      jeo_movie_passing_score: jeo.content.movie_passing_score,
      jeo_max_num_failed_frames: jeo.content.max_num_failed_frames,
      jeo_hard_fail_from_any_frame: jeo.content.hard_fail_from_any_frame,
      jeo_preserve_job_run_parameters: jeo.content.preserve_job_run_parameters,
      jeo_preserve_truth_maps: jeo.content.preserve_truth_maps,
      jeo_permanent_standards: jeo.content.permanent_standards,
    })
  }

  loadNewJeo() {
    this.setState({
      jeo_id: '',
      jeo_description: '',
      jeo_weight_true_pos: 1,
      jeo_weight_false_pos: 1,
      jeo_weight_true_neg: 1,
      jeo_weight_false_neg: 1,
      jeo_frame_passing_score: 70,
      jeo_movie_passing_score: 70,
      jeo_max_num_failed_frames: 10,
      jeo_hard_fail_from_any_frame: false,
      jeo_preserve_job_run_parameters: true,
      jeo_preserve_truth_maps: true,
      jeo_permanent_standards: {},
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
              Object.keys(this.state.jeo_permanent_standards).includes(movie_name)) {
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

  removeExemplarMovie(movie_name) {
    let deepCopyPs = JSON.parse(JSON.stringify(this.state.jeo_permanent_standards))
    if (Object.keys(deepCopyPs).includes(movie_name)) {
      delete deepCopyPs[movie_name]
      this.setLocalStateVar('jeo_permanent_standards', deepCopyPs)
    }
  }

  addExemplarMovie(movie_name, movie_url) {
    let deepCopyPs = JSON.parse(JSON.stringify(this.state.jeo_permanent_standards))
    deepCopyPs[movie_name] = {
      source_movie_url: movie_url,
      framesets: {},
    }
    this.setLocalStateVar('jeo_permanent_standards', deepCopyPs)
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

  buildGetJrsListButton() {
    return (
      <button
          className='btn btn-primary'
          onClick={() => this.getJobRunSummaries()}
      >
        Refresh Summaries
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

  buildExemplarMoviesSection() {
    if (!this.state.jeo_id) {
      return ''
    }
    const add_button = this.buildAddExemplarMovieButton()
    let perm_standards = {}
    perm_standards = this.state.jeo_permanent_standards
    return (
      <div className='row mt-2'>
        <div className='col'>
          <div className='row'>
            <div className='col-6 h5'>
              Exemplar Movies
            </div>
            <div className='col-6'>
              {add_button}
            </div>
          </div>
          <div className='row'>
            <div className='col'>
              {Object.keys(perm_standards).map((movie_name, index) => {
                const perm_standard = this.state.jeo_permanent_standards[movie_name]
                const source_movie_url = perm_standard['source_movie_url']
                return (
                  <div key={index} className='row'>
                    <div className='col-4'>
                      {movie_name}
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
                        onClick={()=>{this.removeExemplarMovie(movie_name)}}
                      >
                        delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  buildObjectivePanel() {
    const load_button = this.buildJeoLoadButton()
    const save_button = this.buildJeoSaveButton()
    const delete_button = this.buildJeoDeleteButton()
    const weight_true_pos_field = this.buildJeoWeightTruePosField()
    const weight_false_pos_field = this.buildJeoWeightFalsePosField()
    const weight_true_neg_field = this.buildJeoWeightTrueNegField()
    const weight_false_neg_field = this.buildJeoWeightFalseNegField()
    const max_num_failed_frames_field = this.buildJeoMaxNumFailedFramesField() 
    const movie_passing_score_field = this.buildJeoMoviePassingScoreField() 
    const frame_passing_score_field = this.buildJeoFramePassingScoreField()
    const hard_fail_any_frame_field = this.buildHardFailAnyFrameField()
    const preserve_job_run_parameters_field = this.buildPreserveJobRunParametersField()
    const preserve_truth_maps_field  = this.buildPreserveTruthMapsField()

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

            <div className='row m-1'>
              <div className='d-inline'>
                Id: 
              </div>
              <div className='d-inline ml-2'>
                {this.state.jeo_id}
              </div>
            </div>

            <div className='row m-1'>
              <div className='col'>
                <div className='row mr-2'>
                  Weights:
                </div>
                <div className='row'>
                  <div className='col-3'>
                  {weight_true_pos_field}
                  </div>
                  <div className='col-3'>
                  {weight_false_pos_field}
                  </div>
                  <div className='col-3'>
                  {weight_true_neg_field}
                  </div>
                  <div className='col-3'>
                  {weight_false_neg_field}
                  </div>
                </div>
              </div>
            </div>

            <div className='row m-1'>
              {max_num_failed_frames_field} 
            </div>

            <div className='row m-1'>
              {frame_passing_score_field}
            </div>

            <div className='row m-1'>
              {movie_passing_score_field}
            </div>

            <div className='row m-1'>
              {hard_fail_any_frame_field}
            </div>

            <div className='row m-1'>
              {preserve_job_run_parameters_field}
            </div>

            <div className='row m-1'>
              {preserve_truth_maps_field}
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
                    value={this.state.jeo_description}
                    onChange={(event) => this.setLocalStateVar('jeo_description', event.target.value)}
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
    const job_run_summary_section = this.buildJobRunSummarySection()
    return (
      <div className='col'>
        <div className='row mt-2'>
          {objective_data}
        </div>

        {exemplar_movies_section}

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
        onClick={()=>{this.setImageMode('add_permanent_standard_box_1')}}
      >
        Add Box
      </button>
    )
  }

  buildDeleteBoxButton() {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.setImageMode('delete_box_1')}}
      >
        Add Unwanted
      </button>
    )
  }

  buildBackToJrsSummaryButton() {
    if (this.state.mode !== 'review') {
      return ''
    }
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.showReviewSummary()}}
      >
        Back
      </button>
    )
  }

  buildImageElement(image_url) {
    const img_style = {
      width: '100%',
    }
    if (image_url) {
      return (
        <img
            id='annotate_image'
            src={image_url}
            alt={image_url}
            style={img_style}
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
        onClick={()=>{this.annotateExemplarMovie(this.state.active_movie_url, 'tile')}}
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

  getTileInfo() {
    const num_cols = this.state.annotate_tile_column_count
    let col_class = 'col-2'
    if (num_cols === '6') {
      col_class = 'col-2'
    } else if (num_cols === '4') {
      col_class = 'col-3'
    } else if (num_cols === '2') {
      col_class = 'col-6'
    }
    return {
      num_cols: num_cols, 
      col_class: col_class,
    }
  }

  buildAnnotatePanelTile() {
    const tile_info = this.getTileInfo()
    const num_cols = tile_info['num_cols']
    const col_class = tile_info['col_class']
    const ordered_hashes = this.props.getFramesetHashesInOrder()
    const num_rows = Math.ceil(ordered_hashes.length / num_cols)
    const col_count_picker = this.buildAnnotateTileColumnCountDropdown()
    let steps_explained = "Select the frames you wish to annotate by clicking on them, press the Annotate button when done. Clicking on no frames gives you all frames of the movie to annotate."
    let when_clicked = (()=>{this.annotateExemplarMovie(this.state.active_movie_url, 'single')})
    let button_label = 'Annotate'
    if (this.state.mode === 'review') {
      steps_explained = "Select the frames you wish to review by clicking on them, press the Review button when done. Clicking on no frames gives you all frames of the movie to review."
      button_label = 'Review'
      when_clicked = (()=>{this.reviewExemplarMovie(this.state.active_movie_url, 'single')})
    }

    let row_num_array = []
    for (let i=0; i < num_rows; i++) {
      row_num_array.push(i)
    }

    const img_style = {
      width: '100%',
    }
    const back_to_jrs_summary_button = this.buildBackToJrsSummaryButton()

    return (
      <div className='row'>
        <div className='col'>
          <div className='row h5'>
            <div className='col-9'>
              {steps_explained}
            </div>
            <div className='d-inline ml-1'>
              {back_to_jrs_summary_button}
            </div>
            <div className='col-3'>
              <button
                className='btn btn-primary'
                onClick={when_clicked}
              >
                {button_label}
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
                  let overlay_text2 = '.'
                  let overlay_style = {
                    color: 'white',
                  }
                  let ot2_style = {
                    color: 'white',
                  }
                  if (this.frameHasAnnotationData(fs_hash)) {
                    overlay_text = 'ANNOTATED'
                    overlay_style['color'] = '#000'
                  } else if (this.state.mode === 'review') {
                    if (this.frameHasT1Data(fs_hash)) {
                      overlay_style['color'] = 'black'
                      overlay_text = 'RESULTS'
                    } 
                    overlay_text2 = this.getFramesetReviewDisplayString(fs_hash)
                    if (overlay_text2 !== '.') {
                      ot2_style['color'] = 'black'
                    }
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
                      <div
                        style={ot2_style}
                      >
                        {overlay_text2}
                      </div>
                      <img
                        id='job_eval_image'
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

  buildPassButton() {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.markFrameAsPassed()}}
      >
        Pass
      </button>
    )
  }

  buildFailButton() {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.markFrameAsFailed()}}
      >
        Fail
      </button>
    )
  }

  buildAddDesiredButton() {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.setImageMode('add_desired_box_1')}}
      >
        Add Desired
      </button>
    )
  }

  buildAddUnwantedBoxButton() {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.setImageMode('add_unwanted_box_1')}}
      >
        Add Unwanted
      </button>
    )
  }

  buildReviewResetButton() {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{console.log(' winky ouch 784')}}
      >
        Reset
      </button>
    )
  }

  buildBackToReviewJrsMovieButton(movie_url) {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.showReviewTile(movie_url)}}
      >
        Back
      </button>
    )
  }

  buildReviewSingleButtons() {
    const pass_button = this.buildPassButton()
    const fail_button = this.buildFailButton()
    const add_desired_button = this.buildAddDesiredButton()
    const strike_box_button = this.buildAddUnwantedBoxButton()
    const reset_button = this.buildReviewResetButton()
    const next_frame_button = this.buildNextFrameButton()
    const prev_frame_button = this.buildPrevFrameButton()
    const back_to_jrs_tile_button = this.buildBackToReviewJrsMovieButton(this.state.active_movie_url)

    return (
      <div>
        <div className='d-inline ml-1'>
          {pass_button}
        </div>

        <div className='d-inline ml-1'>
          {fail_button}
        </div>

        <div className='d-inline ml-1'>
          {add_desired_button}
        </div>

        <div className='d-inline ml-1'>
          {strike_box_button}
        </div>

        <div className='d-inline ml-1'>
          {reset_button}
        </div>

        <div className='d-inline ml-1'>
          {prev_frame_button}
        </div>

        <div className='d-inline ml-1'>
          {next_frame_button}
        </div>

        <div className='d-inline ml-1'>
          {back_to_jrs_tile_button}
        </div>

      </div>
    )
  } 

  buildAnnotateSingleButtons() {
    const add_box_button = this.buildAddBoxButton()
    const delete_box_button = this.buildDeleteBoxButton()
    const show_ocr_button = this.buildShowOcrButton()
    const hide_ocr_button = this.buildHideOcrButton()
    const add_ocr_button = this.buildAddOcrButton()
    const delete_ocr_button = this.buildDeleteOcrButton()
    const next_frame_button = this.buildNextFrameButton()
    const prev_frame_button = this.buildPrevFrameButton()
    const back_to_tile_button = this.buildBackToTileButton()
    return (
      <div>
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
    )
  }

  buildAnnotatePanelSingle() {
    const image_url = this.props.getImageUrl()
    const image_element = this.buildImageElement(image_url)
    let buttons_row = ''
    if (this.state.mode === 'annotate') {
      buttons_row = this.buildAnnotateSingleButtons()
    } else if (this.state.mode === 'review') {
      buttons_row = this.buildReviewSingleButtons()
    } 
    let image_extra_text = '.'
    let extra_text_style = {
      color: 'white',
    }
    if (this.state.mode === 'review') {
      image_extra_text = this.getFramesetReviewDisplayString(this.props.frameset_hash)
      if (!image_extra_text !== '.') {
        extra_text_style['color'] = 'black'
      }
    }
    return (
      <div className='row'>
        <div className='col'>
          <div className='row m-1'>
            {buttons_row}
          </div>

          <div style={extra_text_style} className='row'>
            {image_extra_text}
          </div>

          <div id='annotate_image_div' className='row'>
            {image_element}
            <CanvasAnnotateOverlay
              image_width={this.props.image_width}
              image_height={this.props.image_height}
              image_scale={this.state.image_scale}
              image_url={image_url}
              mode={this.state.image_mode}
              clickCallback={this.handleImageClick}
              last_click={this.state.clicked_coords}
              getOcrRegions={this.getOcrRegions}
              getPermanentStandardBoxes={this.getPermanentStandardBoxes}
              getT1MatchBoxes={this.getT1MatchBoxes}
              getUnwantedBoxes={this.getUnwantedBoxes}
              getDesiredBoxes={this.getDesiredBoxes}
            />
          </div>

        </div>
      </div>
    )
  }

  buildAnnotatePanel() {
//    const ocr_id_field = this.buildOcrMatchIdField()
    const ocr_id_field = ''
    let the_body = ''
    let the_title = ''
    const movie_name = getFileNameFromUrl(this.state.active_movie_url)
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
      this.state.active_job_id,
      'active_job_id',
      ((value)=>{this.setLocalStateVar('active_job_id', value)})
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
    if (!this.jobHasMatchForExemplarMovie()) {
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
    if (this.state.jrs_ids_to_compare.length < 1) {
      return 'Compare'
    }

    return (
      <button
        className='btn btn-link p-0'
        onClick={()=>{this.startCompare()}}
      >
        Compare
      </button>
    )
  }

  buildJrsDeleteButton() {
    if (this.state.jrs_ids_to_delete.length < 1) {
      return 'Delete'
    }

    return (
      <button
        className='btn btn-link p-0'
        onClick={()=>{this.deleteJrsRecords()}}
      >
        Delete
      </button>
    )
  }

  startCompare() {
    let compare_mode_data = {}
    for (let i=0; i < this.state.jrs_ids_to_compare.length; i++) {
      const jrs_id = this.state.jrs_ids_to_compare[i]
      compare_mode_data[i] = {
        state: 'summary',
        jrs_id: jrs_id,
        movie_url: '',
        frameset_hash: '',
        frameset_overlay_modes: {},
        hide_non_job_frames: false,
        hide_non_review_frames: false,
      }
    }
    this.setState({
        mode: 'compare',
        compare_single_mode_data: compare_mode_data,
    })
  }

  buildManualJrsButton() {
    if (!this.state.jeo_id || !this.state.active_job_id) {
      return ''
    }

    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.showReviewSummary(true)}}
      >
        Build Manual JRS
      </button>
    )
  }

  buildSendInManualJrsButton() {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.submitJobEvalJob('build_manual_job_run_summary')}}
      >
        Finalize 
      </button>
    )
  }

  buildDeleteJrsMovieButton(movie_url) {
    return (
      <button
        className='btn btn-link'
        onClick={()=>{this.deleteJrsMovie(movie_url)}}
      >
        Delete
      </button>
    )
  }

  buildReviewJrsMovieButton(movie_url) {
    return (
      <button
        className='btn btn-link'
        onClick={()=>{this.showReviewTile(movie_url)}}
      >
        Review
      </button>
    )
  }

  showReviewTile(movie_url) {
    this.setState({
        mode: 'review',
        annotate_view_mode: 'tile',
        active_movie_url: movie_url,
        message: '',
    })
  }

  showReviewSummary(clear_jrs_movies=false) {
    for (let i=0; i < Object.keys(this.props.tier_1_matches).length; i++) {
      const scanner_type = Object.keys(this.props.tier_1_matches)[i]
      for (let j=0; j < Object.keys(this.props.tier_1_matches[scanner_type]).length; j++) {
        const match_key = Object.keys(this.props.tier_1_matches[scanner_type])[j]
        const match_obj = this.props.tier_1_matches[scanner_type][match_key]
        if (
          Object.keys(match_obj).includes('job_id') &&
          match_obj['job_id'] === this.state.active_job_id
        ) {
          const movie_urls = Object.keys(match_obj['movies'])
          let build_jrs_movies = {}
          for (let k=0; k < movie_urls.length; k++) {
            const movie_url = movie_urls[k]
            build_jrs_movies[movie_url] = {
              'framesets': {},
            }
            
          }

          if (clear_jrs_movies) {
            this.setState({
              mode: 'review',
              annotate_view_mode: 'summary',
              jrs_movies: build_jrs_movies,
              active_t1_results_key: match_key,
              active_t1_scanner_type: scanner_type,
            })
          } else {
            this.setState({
              mode: 'review',
              annotate_view_mode: 'summary',
              active_t1_results_key: match_key,
              active_t1_scanner_type: scanner_type,
            })
          }
          return
        }
      }
    }
    this.setState({
      message: 'error: the job you selected needs to be loaded into memory first'
    })
  }

  buildJrsMovieNamesDiv(jrs) {
    if (jrs.movie_names.length === 0) {
      return ''
    }
    return (
      <div className='row'>
        <div className='col'>
          {Object.keys(jrs.movie_names).map((movie_name_index, index) => {
            const movie_name = jrs.movie_names[movie_name_index]
            return (
              <div key={index} className='row'>
                {movie_name}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  buildJobRunSummaryList() {
    if (!this.state.job_run_summaries || Object.keys(this.state.job_run_summaries).length === 0) {
      return ''
    }
    if (!this.state.jeo_id) {
      return ''
    }
    const compare_button = this.buildCompareButton()
    const delete_button= this.buildJrsDeleteButton()
    return (
      <div className='col'>
        <div className='row font-weight-bold'>
          <div className='col-1 border-bottom'>
            Job Id
          </div>
          <div className='col-1 border-bottom'>
            Type
          </div>
          <div className='col-1 border-bottom'>
            Score
          </div>
          <div className='col-3 border-bottom'>
            Movies
          </div>
          <div className='col-3 border-bottom'>
            Created On
          </div>
          <div className='col-1 border-bottom'>
            {compare_button}
          </div>
          <div className='col-1 border-bottom'>
            {delete_button}
          </div>
        </div>
          
        {Object.keys(this.state.job_run_summaries).map((jrs_key, index) => {
          const jrs = this.state.job_run_summaries[jrs_key]
          const movie_names_div = this.buildJrsMovieNamesDiv(jrs)
          const job_id_short = jrs.job_id.substring(0, 5) + '...'
          if (jrs.job_eval_objective_id !== this.state.jeo_id) {
            return ''
          }
          let compare_checked = false
          if (this.state.jrs_ids_to_compare.includes(jrs_key)) {
            compare_checked = true
          }
          let delete_checked = false
          if (this.state.jrs_ids_to_delete.includes(jrs_key)) {
            delete_checked = true
          }
          return (
            <div 
              key={index}
              className='row'
            >
              <div className='col-1'>
                {job_id_short}
              </div>
              <div className='col-1'>
                {jrs.summary_type}
              </div>
              <div className='col-1'>
                {jrs.score}
              </div>
              <div className='col-3'>
                {movie_names_div}
              </div>
              <div className='col-3'>
                {jrs.created_on}
              </div>
              <div className='col-1'>
                <input
                  className='ml-2 mr-2 mt-1'
                  checked={compare_checked}
                  type='checkbox'
                  onChange={
                    () => this.addRemoveToJrsIdsToCompare(jrs_key) 
                  }
                />
              </div>
              <div className='col-1'>
                <input
                  className='ml-2 mr-2 mt-1'
                  checked={delete_checked}
                  type='checkbox'
                  onChange={
                    () => this.addRemoveToJrsIdsToDelete(jrs_key) 
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
    if (!this.state.jeo_id) {
      return ''
    }

    const exemplar_job_picker = this.buildGenerateExemplarJrsLine()
    const generate_exemplar_button = this.buildGenerateExemplarJrsButton()
    const manual_review_button = this.buildManualJrsButton()
    const jrs_list = this.buildJobRunSummaryList()
    const get_jrs_button = this.buildGetJrsListButton()
    return (
      <div className='row border-top'>
        <div className='col'>
          <div className='row h3'>
            <div className='col-8'>
              Job Run Summaries
            </div>
            <div className='col-4'>
              {get_jrs_button}
            </div>
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
            Compare Summaries
          </div>
          <div className='row'>
            {jrs_list}
          </div>

        </div>
      </div>
    )
  }

  getMovieUrlsForActiveJob() {
    if (!this.state.jrs_movies) {
      return []
    }
    return Object.keys(this.state.jrs_movies)
  }

  buildReviewPanelSummary() {
    const movie_urls = this.getMovieUrlsForActiveJob()
    let send_to_api_button = ''
    return (
      <div className='row'>
        <div className='col'>
          <div className='row'>
            movies
          </div>
        {movie_urls.map((movie_url, index) => {
          const movie_name = getFileNameFromUrl(movie_url)
          const delete_movie_button = this.buildDeleteJrsMovieButton(movie_url)
          const review_movie_button = this.buildReviewJrsMovieButton(movie_url)
          let summary_info = 'no review data found'
          if (
            Object.keys(this.state.jrs_movies).includes(movie_url) &&
            Object.keys(this.state.jrs_movies[movie_url]['framesets']).length > 0
          ) {
            summary_info = Object.keys(this.state.jrs_movies[movie_url]['framesets']).length.toString() + ' frames reviewed'
            send_to_api_button = this.buildSendInManualJrsButton()
          }
          return (
            <div 
              key={index}
              className='row'
            >
              <div className='col-4'>
                {movie_name}
              </div>
              <div className='col-3'>
                {summary_info}
              </div>
              <div className='col-1'>
                {delete_movie_button}
              </div>
              <div className='col-2'>
                {review_movie_button}
              </div>
            </div>
          )
        })}
          <div className='row'>
            {send_to_api_button}
          </div>
        </div>
      </div>
    )
  }

  buildReviewPanel() {
    let the_body = ''
    let the_title = ''
    const movie_name = getFileNameFromUrl(this.state.active_movie_url)
    if (this.state.annotate_view_mode === 'single') {
      the_body = this.buildAnnotatePanelSingle()
      const image_url = this.props.getImageUrl()
      const image_name = getFileNameFromUrl(image_url)
      const position_string = this.getFramePositionString()
      the_title = movie_name + ', ' + image_name + ' - ' +position_string
    } else if (this.state.annotate_view_mode === 'tile') {
      the_body = this.buildAnnotatePanelTile()
      the_title = movie_name 
    } else if (this.state.annotate_view_mode === 'summary') {
      the_body = this.buildReviewPanelSummary()
      the_title = 'Manually Reviewing Job ' + this.state.active_job_id
    }

    return (
      <div className='col'>
        <div className='row mt-2 h4'>
          {the_title}
        </div>

        {the_body}

      </div>
    )
  }

  buildCompareSingleTitle(panel_id) {
    const mode_data = this.state.compare_single_mode_data[panel_id]
    const jrs = this.state.job_run_summaries[mode_data['jrs_id']]
    const job_id_short = jrs.job_id.substring(0, 5) + '...'
    let summary_line = 'Summary for Job ' + job_id_short
    if (mode_data['state'] === 'movie_list') {
      summary_line = 'Listing Movies for Job ' + job_id_short
    } else if (mode_data['state'] === 'frameset_list') {
      summary_line = 'Listing Framesets for Job ' + job_id_short
    }
    return (
      <div className='row ml-2 font-weight-bold'>
        {summary_line}
      </div>
    )
  }

  buildCompareSingleSummary(panel_id) {
    const mode_data = this.state.compare_single_mode_data[panel_id]
    if (mode_data['state'] !== 'summary') {
      return ''
    }
    const jrs = this.state.job_run_summaries[mode_data['jrs_id']]
    return (
      <div className='col'>
        <div className='row'>
          score: {jrs.score}
        </div>
        <div className='row'>
          created_on: {jrs.created_on}
        </div>
      </div>
    )
  }

  setCompareSingleAttributeFramesetVar(panel_id, frameset_hash, attribute_name, new_value) {
    let deepCopyCsmd = JSON.parse(JSON.stringify(this.state.compare_single_mode_data))
    deepCopyCsmd[panel_id][attribute_name][frameset_hash] = new_value
    this.setState({
      compare_single_mode_data: deepCopyCsmd,
    })
  }

  setCompareSingleAttribute(panel_id, attribute_name, new_value) {
    let deepCopyCsmd = JSON.parse(JSON.stringify(this.state.compare_single_mode_data))
    deepCopyCsmd[panel_id][attribute_name] = new_value
    this.setState({
      compare_single_mode_data: deepCopyCsmd,
    })
  }

  setCompareMultipleAttributes(panel_id, input_hash) {
    let deepCopyCsmd = JSON.parse(JSON.stringify(this.state.compare_single_mode_data))
    for (let i=0; i < Object.keys(input_hash).length; i++) {
      const key_name = Object.keys(input_hash)[i]
      deepCopyCsmd[panel_id][key_name] = input_hash[key_name]
    }
    this.setState({
      compare_single_mode_data: deepCopyCsmd,
    })
  }

  buildCompareSingleNav(panel_id) {
    let first_button = ''
    let second_button = ''
    let third_button = ''
    const mode_data = this.state.compare_single_mode_data[panel_id]
    if (mode_data['state'] === 'summary') {
      first_button = (
        <button
          className='btn btn-link'
          onClick={()=>{this.setCompareSingleAttribute(panel_id, 'state', 'movie_list')}}
        >
          Movies
        </button>
      )
    } else if (mode_data['state'] === 'movie_list') {
      first_button = (
        <button
          className='btn btn-link'
          onClick={()=>{this.setCompareSingleAttribute(panel_id, 'state', 'summary')}}
        >
          Summary
        </button>
      )
    }

    return (
      <div className='col'>
        <div className='row'>
          <div className='col-4'>
            {first_button}
          </div>
          <div className='col-4'>
            {second_button}
          </div>
          <div className='col-4'>
            {third_button}
          </div>
        </div>
      </div>
    )
  }

  getMovieUrlForMovieName(jrs, movie_name) {
    for (let i=0; i < Object.keys(jrs.content['movies']).length; i++) {
      const movie_url = Object.keys(jrs.content['movies'])[i]
      if (movie_url.includes(movie_name)) {
        return movie_url
      }
    }
  }

  setCompareSingleFramesetList(panel_id, movie_url) {
    this.setCompareMultipleAttributes(
      panel_id, 
      {
        'state': 'frameset_list',
        'movie_url': movie_url,
        'frameset_hash': {},
        'frameset_overlay_modes': {},
      }
    )
  }

  buildCompareSingleMovie(panel_id) {
    const mode_data = this.state.compare_single_mode_data[panel_id]
    if (mode_data['state'] !== 'movie_list') {
      return ''
    }
    const jrs = this.state.job_run_summaries[mode_data['jrs_id']]
    return (
      <div className='col'>
        <div className='row font-weight-bold'>
          Movies:
        </div>
        {jrs.movie_names.map((movie_name, index) => {
          const movie_url = this.getMovieUrlForMovieName(jrs, movie_name)
          return (
            <div key={index} className='row'>
              <button
                className='btn btn-link'
                onClick={()=>{this.setCompareSingleFramesetList(panel_id, movie_url)}}
              >
                {movie_name}
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  buildCompareSingleFramesetList(panel_id) {
    const mode_data = this.state.compare_single_mode_data[panel_id]
    if (mode_data['state'] !== 'frameset_list') {
      return ''
    }
    const img_row_style = {
      position: 'relative',
    }
    const img_style = {
      width: '100%',
    }
    const overlay_img_style = {
      width: '100%',
      opacity: .4,
      position: 'absolute',
      top: 0, 
      left: 0,
    }
    const jrs = this.state.job_run_summaries[mode_data['jrs_id']]
    const movie_url = mode_data['movie_url']
    const movie_name = getFileNameFromUrl(movie_url)
    const movie_data = jrs['content']['movies'][movie_url]
    const source_movie = jrs['content']['source_movies'][movie_url]
    const movie_stats = jrs['content']['statistics']['movie_statistics'][movie_url]
    const frameset_hashes = this.props.getFramesetHashesInOrder(source_movie)
    return (
      <div className='col border-bottom pb-2 ml-2 mb-2'>
        <div className='row font-weight-bold'>
          Movie {movie_name}
        </div>

        <div className='row'>
          <div className='d-inline'>
            Pass / Fail
          </div>
          <div className='d-inline ml-2'>
            {movie_stats['pass_or_fail']}
          </div>
        </div>

        <div className='row'>
          <div className='d-inline'>
            Movie Score:
          </div>
          <div className='d-inline ml-2'>
            {movie_stats['score']}
          </div>
        </div>

        <div className='row'>
          <div className='d-inline'>
            Max Frameset Score:
          </div>
          <div className='d-inline ml-2'>
            {movie_stats['max_frameset_score']}
          </div>
        </div>

        <div className='row'>
          <div className='d-inline'>
            Min Frameset Score:
          </div>
          <div className='d-inline ml-2'>
            {movie_stats['min_frameset_score']}
          </div>
        </div>

        <div className='row ml-4 h5 border-bottom'>
          Frameset Data: 
        </div>

        {frameset_hashes.map((frameset_hash, index) => {
          let frameset_counts = {
            not_used: true,
          }
          let overlay_image_url = ''
          if (Object.keys(movie_data['framesets']).includes(frameset_hash)) {
            frameset_counts = movie_data['framesets'][frameset_hash]['counts']
            const fs_mode = mode_data['frameset_overlay_modes'][frameset_hash]
            overlay_image_url = movie_data['framesets'][frameset_hash]['maps'][fs_mode]
          }

          if (
            this.state.compare_single_mode_data[panel_id]['hide_non_job_frames'] &&
            Object.keys(frameset_counts).includes('not_used')
          ) {
            return ''
          }
          if (
            this.state.compare_single_mode_data[panel_id]['hide_non_review_frames'] &&
            !Object.keys(movie_data['framesets'][frameset_hash]).includes(['maps']) &&
            !Object.keys(movie_data['framesets'][frameset_hash]['maps']).includes('f_pos')
          ) {
            return ''
          }

          const len_string = (index+1).toString() + '/' + frameset_hashes.length.toString()
          const name_string = frameset_hash + ' - ' + len_string
          const img_url = source_movie['framesets'][frameset_hash]['images'][0]

          const frameset_stats = movie_stats['framesets'][frameset_hash]
          const frameset_stats_rows = this.buildCompareSingleFramesetStatsRows(frameset_counts, frameset_stats)
          const frameset_overlay_mode = mode_data['frameset_overlay_modes'][frameset_hash]
          const frameset_view_buttons = this.buildCompareSingleFramesetStatsViewToggle(panel_id, frameset_counts, frameset_hash, frameset_overlay_mode)
          return (
            <div key={index} className='col'>
              <div className='row font-weight-bold'>
                {name_string}
              </div>

              <div className='row'>
                {frameset_stats_rows}
              </div>

              <div className='row'>
                {frameset_view_buttons}
              </div>

              <div 
                style={img_row_style} 
                className='row'
              >
                <img 
                  style={img_style}
                  src={img_url}
                  alt={img_url}
                />
                <img 
                  style={overlay_img_style}
                  src={overlay_image_url}
                  alt={overlay_image_url}
                />
              </div>

            </div>
          )
        })}
      </div>
    )
  }

  buildSetOverlayModeButton(panel_id, frameset_hash, label, new_overlay_mode) {
    return (
      <button
        className='btn btn-link'
        onClick={()=>{this.setCompareSingleAttributeFramesetVar(panel_id, frameset_hash, 'frameset_overlay_modes', new_overlay_mode)}}
      >
        {label}
      </button>
    )
  }

  buildCompareSingleFramesetStatsViewToggle(panel_id, counts, frameset_hash, overlay_mode) {
    if (Object.keys(counts).includes('not_used')) {
      return ''
    }
    let first_button = ''
    let second_button = ''
    let third_button = ''
    let fourth_button = ''
    let fifth_button = ''
    if (overlay_mode === 'none' || !overlay_mode) {
      first_button = (
        <div className='pt-2 mr-2 font-weight-bold'>
          None
        </div>
      )
      second_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'F Pos', 'f_pos')
      third_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'F Neg', 'f_neg')
      fourth_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'All False', 'f_all')
      fifth_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'T Pos', 't_pos')
    } else if (overlay_mode === 'f_pos') {
      first_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'None', 'none')
      second_button = (
        <div className='pt-2 mr-2 font-weight-bold'>
          F Pos
        </div>
      )
      third_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'F Neg', 'f_neg')
      fourth_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'All False', 'f_all')
      fifth_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'T Pos', 't_pos')
    } else if (overlay_mode === 'f_neg') {
      first_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'None', 'none')
      second_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'F Pos', 'f_pos')
      third_button = (
        <div className='pt-2 mr-2 font-weight-bold'>
          F Neg
        </div>
      )
      fourth_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'All False', 'f_all')
      fifth_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'T Pos', 't_pos')
    } else if (overlay_mode === 'f_all') {
      first_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'None', 'none')
      second_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'F Pos', 'f_pos')
      third_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'F Neg', 'f_neg')
      fourth_button = (
        <div className='pt-2 mr-2 font-weight-bold'>
          All False
        </div>
      )
      fifth_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'T Pos', 't_pos')
    } else if (overlay_mode === 't_pos') {
      first_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'None', 'none')
      second_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'F Pos', 'f_pos')
      third_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'F Neg', 'f_neg')
      fourth_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'All False', 'f_all')
      fifth_button = (
        <div className='pt-2 mr-2 font-weight-bold'>
          T Pos
        </div>
      )
    }
    return (
      <div className='col'>
        <div className='row'>
          <div className='d-inline'>
            Show:
          </div>
          <div className='d-inline m-1 p-0 border-right'>
            {first_button}
          </div>
          <div className='d-inline m-1 p-0 border-right'>
            {second_button}
          </div>
          <div className='d-inline m-1 p-0 border-right'>
            {third_button}
          </div>
          <div className='d-inline m-1 p-0 border-right'>
            {fourth_button}
          </div>
          <div className='d-inline m-1 p-0'>
            {fifth_button}
          </div>
        </div>
      </div>
    )
  }

  buildCompareSingleFramesetStatsRows(counts, frameset_stats) {
    let job_output_comment = ''
    if (Object.keys(counts).includes('not_used')) {
      job_output_comment = 'No job output'
    }
    let frameset_stats_pass_or_fail = 'pass'
    let frameset_stats_score = ''
    let frameset_stats_tpos = ''
    let frameset_stats_tneg = ''
    let frameset_stats_fpos = ''
    let frameset_stats_fneg = ''
    if (frameset_stats) {
      frameset_stats_pass_or_fail = frameset_stats['pass_or_fail']
      frameset_stats_score = (
        <div className='row'>
          <div className='d-inline'>
            Score:
          </div>
          <div className='d-inline ml-2'>
            {frameset_stats['score']}
          </div>
        </div>
      )
      frameset_stats_tpos = (
        <div className='row'>
          <div className='d-inline'>
            True Positives:
          </div>
          <div className='d-inline ml-2'>
            {counts['t_pos']}
          </div>
        </div>

      )
      frameset_stats_tneg = (
        <div className='row'>
          <div className='d-inline'>
            True Negatives:
          </div>
          <div className='d-inline ml-2'>
            {counts['t_neg']}
          </div>
        </div>

      )
      frameset_stats_fpos = (
        <div className='row'>
          <div className='d-inline'>
            False Positives:
          </div>
          <div className='d-inline ml-2'>
            {counts['f_pos']}
          </div>
        </div>

      )
      frameset_stats_fneg = (
        <div className='row'>
          <div className='d-inline'>
            False Negatives:
          </div>
          <div className='d-inline ml-2'>
            {counts['f_neg']}
          </div>
        </div>
      )
    }
    return (
      <div className='col'>
        <div className='row'>
          <div className='font-italic'>
            {job_output_comment}
          </div>
        </div>

        <div className='row'>
          <div className='d-inline'>
            Pass or Fail:
          </div>
          <div className='d-inline ml-2'>
            {frameset_stats_pass_or_fail}
          </div>
        </div>

        {frameset_stats_score}
        {frameset_stats_tpos}
        {frameset_stats_tneg}
        {frameset_stats_fpos}
        {frameset_stats_fneg}

      </div>

    )
  }

  buildCompareSingleControls(panel_id, job_run_summary) {
    let job_checked_value = ''
    let job_new_value = true
    if (this.state.compare_single_mode_data[panel_id]['hide_non_job_frames']) {
      job_checked_value = 'checked'
      job_new_value = false
    }
    const job_line = (
      <div className='row'>
        <div className='d-inline'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={job_checked_value}
            type='checkbox'
            onChange={()=>{this.setCompareSingleAttribute(panel_id, 'hide_non_job_frames', job_new_value)}}
          />
        </div>
        <div className='d-inline'>
          Hide Non Job Frames
        </div>
      </div>
    )

    let review_line = ''
    if (job_run_summary['summary_type'] === 'manual') {
      let review_checked_value = ''
      let review_new_value = true
      if (this.state.compare_single_mode_data[panel_id]['hide_non_review_frames']) {
        review_checked_value = 'checked'
        review_new_value = false
      }
      review_line = (
        <div className='row'>
          <div className='d-inline'>
            <input
              className='ml-2 mr-2 mt-1'
              checked={review_checked_value}
              type='checkbox'
              onChange={()=>{this.setCompareSingleAttribute(panel_id, 'hide_non_review_frames', review_new_value)}}
            />
          </div>
          <div className='d-inline'>
            Hide Non Reviewed Frames
          </div>
        </div>
      )
    }

    return (
      <div className='col'>
        {job_line}
        {review_line}
      </div>
    )
  }

  buildComparePanelSingle(job_run_summary_id, panel_id) {
    const jrs = this.state.job_run_summaries[job_run_summary_id]
    const title_section = this.buildCompareSingleTitle(panel_id)
    const summary_section = this.buildCompareSingleSummary(panel_id)
    const movie_section = this.buildCompareSingleMovie(panel_id)
    const frameset_section = this.buildCompareSingleFramesetList(panel_id)
    const nav_section = this.buildCompareSingleNav(panel_id)
    const controls_section = this.buildCompareSingleControls(panel_id, jrs)
    const height_px_string = (window.innerHeight * .85).toString() + 'px'
    const frameset_style = {
      overflow: 'scroll',
      height: height_px_string,
    }
    return (
      <div
        className='row'
      >
        <div className='col'>
          <div className='row'>
            {title_section}
          </div>
          <div className='row'>
            {nav_section}
          </div>
          <div className='row'>
            {controls_section}
          </div>
          <div className='row'>
            {summary_section}
          </div>
          <div className='row mt-2'>
            {movie_section}
          </div>
          <div style={frameset_style} className='row'>
            {frameset_section}
          </div>
        </div>
      </div>
    )
  }

  buildComparePanel() {
    let body = ''
    let outer_col_class = 'col'
    if (this.state.jrs_ids_to_compare.length > 4) {
      return 'too many columns selected'
    } else if (this.state.jrs_ids_to_compare.length === 4) {
      outer_col_class = 'col-3'
    } else if (this.state.jrs_ids_to_compare.length === 3) {
      outer_col_class = 'col-4'
    } else if (this.state.jrs_ids_to_compare.length === 2) {
      outer_col_class = 'col-6'
    } else if (this.state.jrs_ids_to_compare.length === 1) {
      outer_col_class = 'col-12'
    }

    return (
      <div className='col'>
        <div className='row'>
          {this.state.jrs_ids_to_compare.map((jrs_id, index) => {
            if (index < this.state.jrs_ids_to_compare.length - 1) {
              outer_col_class += ' border-right'
            }
            const single_col_contents = this.buildComparePanelSingle(jrs_id, index)
            return (
              <div 
                key={index}
                className={outer_col_class}
              >
                {single_col_contents}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  render() {
    const mode_nav = this.buildModeNav()
    let title = 'Job Evaluation - Home'
    let message = '.'
    let message_style = {'color': 'white'}
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
    if (this.state.message) {
      message = this.state.message
      message_style['color'] = 'black'
    }
    return (
      <div className='col ml-2'>
        <div>
          {mode_nav}
        </div>
        <div className='row h2'>
          {title}
        </div>
        <div style={message_style} className='row'>
          {message}
        </div>

        <div className='row'>
          {page_content}
        </div>
      </div>
    )
  }
}

export default JobEvalPanel;
