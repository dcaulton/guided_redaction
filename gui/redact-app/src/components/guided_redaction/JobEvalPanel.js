import React from 'react';
import JobEvalCompareControls from './JobEvalCompareControls';
import {
  getFileNameFromUrl
} from './redact_utils.js'
import CanvasAnnotateOverlay from './CanvasAnnotateOverlay'
import {
  makePlusMinusRowLight,
  buildLabelAndTextInput,
  buildLabelAndDropdown,
} from './SharedControls'

class JobEvalPanel extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      mode: '',
      message: '',
      message_class: '',
      image_mode: '',
      compare_single_mode_data: {},
      image_height: 900,
      image_width: 1600,
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
      copied_frameset_hash: '',
      clicked_coords: [],
      jeo_id: '',
      jeo_description: '',
      jeo_permanent_standards: {},
      jeo_weight_false_pos: 1,
      jeo_weight_false_neg: 20,
      jeo_frame_passing_score: 70,
      jeo_movie_passing_score: 70,
      jeo_max_num_failed_frames: 2,
      jeo_max_num_missed_entities_single_frameset: 2,
      jeo_hard_fail_from_any_frame: false,
      jeo_preserve_job_run_parameters: true,
      something_changed: false,
      job_eval_objectives: {},
      job_run_summaries: {},
      jrs_ids_to_compare: [],
      jrs_ids_to_delete: [],
      jrs_movies: {},
      job_comment: '',
      finalize_manual_submitted: false,
    }
    this.setLocalStateVarAndWarn=this.setLocalStateVarAndWarn.bind(this)
    this.setLocalStateVar=this.setLocalStateVar.bind(this)
    this.afterJeoSave=this.afterJeoSave.bind(this)
    this.loadJeo=this.loadJeo.bind(this)
    this.getJobEvalObjectives=this.getJobEvalObjectives.bind(this)
    this.getJobRunSummariesAndAnnounce=this.getJobRunSummariesAndAnnounce.bind(this)
    this.handleImageClick=this.handleImageClick.bind(this)
    this.getOcrRegions=this.getOcrRegions.bind(this)
    this.getPermanentStandardBoxes=this.getPermanentStandardBoxes.bind(this)
    this.getDesiredBoxes=this.getDesiredBoxes.bind(this)
    this.getUnwantedBoxes=this.getUnwantedBoxes.bind(this)
    this.keyPress=this.keyPress.bind(this)
    this.getT1MatchBoxes=this.getT1MatchBoxes.bind(this)
    this.setImageScale=this.setImageScale.bind(this)
    this.setMessage=this.setMessage.bind(this)
    this.setUpImageParms=this.setUpImageParms.bind(this)
    this.getSelectedFramesetHashesInOrder=this.getSelectedFramesetHashesInOrder.bind(this)
  }

  setAnnotateMovieComment(comment_string) {
    const movie_name = getFileNameFromUrl(this.state.active_movie_url)
    let deepCopyPs= JSON.parse(JSON.stringify(this.state.jeo_permanent_standards))
    deepCopyPs[movie_name]['comment'] = comment_string
    this.setState({
      jeo_permanent_standards: deepCopyPs,
    })
  }

  resetFrameAnnotateData() {
    const movie_name = getFileNameFromUrl(this.state.active_movie_url)
    if (!Object.keys(this.state.jeo_permanent_standards).includes(movie_name)) {
      return
    }
    const fsh = this.props.frameset_hash
    if (!Object.keys(this.state.jeo_permanent_standards).includes(movie_name)) {
      return
    }
    if (!Object.keys(this.state.jeo_permanent_standards[movie_name]['framesets']).includes(fsh)) {
      return
    }
    let deepCopyPs= JSON.parse(JSON.stringify(this.state.jeo_permanent_standards))
    delete deepCopyPs[movie_name]['framesets'][fsh]
    this.setState({
      jeo_permanent_standards: deepCopyPs,
    })
  }

  pasteAnnotation() {
    const movie_name = getFileNameFromUrl(this.state.active_movie_url)
    const old_fsh = this.state.copied_frameset_hash
    if (Object.keys(this.state.jeo_permanent_standards[movie_name]['framesets']).includes(old_fsh)) {
      const prev_annotations = this.state.jeo_permanent_standards[movie_name]['framesets'][old_fsh]
      let deepCopyPs = JSON.parse(JSON.stringify(this.state.jeo_permanent_standards))
      deepCopyPs[movie_name]['framesets'][this.props.frameset_hash] = prev_annotations
      this.setState({
        jeo_permanent_standards: deepCopyPs,
      })
    }
  }

  addSameAnnotationsAsPrevFrame(current_hash) {
    const ordered_hashes = this.props.getFramesetHashesInOrder()
    if (this.props.frameset_hash && ordered_hashes) {
      const cur_hash_index = ordered_hashes.indexOf(this.props.frameset_hash)
      if (cur_hash_index === 0) {
        return 
      }
      const prev_fs_hash = ordered_hashes[cur_hash_index-1]
      const movie_name = getFileNameFromUrl(this.state.active_movie_url)
      if (!Object.keys(this.state.jeo_permanent_standards).includes(movie_name)) {
        return
      }
      if (!Object.keys(this.state.jeo_permanent_standards[movie_name]['framesets']).includes(prev_fs_hash)) {
        return
      }
      const prev_annotations = this.state.jeo_permanent_standards[movie_name]['framesets'][prev_fs_hash]
      let deepCopyPs= JSON.parse(JSON.stringify(this.state.jeo_permanent_standards))
      deepCopyPs[movie_name]['framesets'][this.props.frameset_hash] = prev_annotations
      this.setState({
        jeo_permanent_standards: deepCopyPs,
      })
    }
  }

  setImageScale() {
    if (!document.getElementById('annotate_image')) {
      return
    }
    const scale = (document.getElementById('annotate_image').width /
        document.getElementById('annotate_image').naturalWidth)
    this.setState({
      image_scale: scale,
    })
  }

  setImageSize(the_image) {
    var app_this = this
    if (the_image) {
      let img = new Image()
      img.src = the_image
      img.onload = function() {
        app_this.setState({
          image_width: this.width,
          image_height: this.height,
        }, app_this.setImageScale()
        )
      }
    }
  }

  setMessage(the_message, the_class='') {
    if (!the_class) {
      the_class = 'primary'
    }
    this.setState({
      message: the_message,
      message_class: the_class,
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
    job_data['request_data']['job_comment'] = this.state.job_comment
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
        after_loaded: () => {this.getJobRunSummariesAndAnnounce()},
        when_failed: () => {this.setMessage('build manual job run summary failed')},
      })
    }
  }

  getJobRunSummariesAndAnnounce() {
    this.getJobRunSummaries()
    this.setMessage('Job Run Summary has completed and is now available for viewing')
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
            onChange={() => this.setLocalStateVarAndWarn('jeo_preserve_job_run_parameters', !this.state.jeo_preserve_job_run_parameters)}
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
            onChange={() => this.setLocalStateVarAndWarn('jeo_hard_fail_from_any_frame', !this.state.jeo_hard_fail_from_any_frame)}
          />
        </div>
        <div className='d-inline'>
          Hard Fail Movie if Any Frame Fails
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
      ((value)=>{this.setLocalStateVarAndWarn('jeo_frame_passing_score', value)})
    )
  }

  buildJeoMoviePassingScoreField() {
    return buildLabelAndTextInput(
      this.state.jeo_movie_passing_score,
      'Movie Passing Score (0-100)',
      'jeo_movie_passing_score',
      'jeo_movie_passing_score',
      4,
      ((value)=>{this.setLocalStateVarAndWarn('jeo_movie_passing_score', value)})
    )
  }

  buildJeoMaxNumFailedFramesField() {
    return buildLabelAndTextInput(
      this.state.jeo_max_num_failed_frames,
      'Max Num of Failed Frames',
      'jeo_max_num_failed_frames',
      'jeo_max_num_failed_frames',
      4,
      ((value)=>{this.setLocalStateVarAndWarn('jeo_max_num_failed_frames', value)})
    )
  }

  buildJeoMaxNumMissedEntitiesField() {
    return buildLabelAndTextInput(
      this.state.jeo_max_num_missed_entities_single_frameset,
      'Max Num of Missed Entities In a Single Frame',
      'jeo_max_num_missed_entities_single_frameset',
      'jeo_max_num_missed_entities_single_frameset',
      4,
      ((value)=>{this.setLocalStateVarAndWarn('jeo_max_num_missed_entities_single_frameset', value)})
    )
  }

  buildJeoWeightFalsePosField() {
    return buildLabelAndTextInput(
      this.state.jeo_weight_false_pos,
      'False Positive Weight',
      'jeo_weight_false_pos',
      'jeo_weight_false_pos',
      4,
      ((value)=>{this.setLocalStateVarAndWarn('jeo_weight_false_pos', value)})
    )
  }

  buildJeoWeightFalseNegField() {
    return buildLabelAndTextInput(
      this.state.jeo_weight_false_neg,
      'False Negative Weight',
      'jeo_weight_false_neg',
      'jeo_weight_false_neg',
      4,
      ((value)=>{this.setLocalStateVarAndWarn('jeo_weight_false_neg', value)})
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
    } else if (event.keyCode === 38) {
      this.addSameAnnotationsAsPrevFrame(this.props.frameset_hash)
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
    return '.'
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
    const ordered_hashes = this.getSelectedFramesetHashesInOrder()
    const cur_index = ordered_hashes.indexOf(this.props.frameset_hash)
    return (cur_index + 1).toString() + '/' + ordered_hashes.length.toString()
  }

  getSelectedFramesetHashesInOrder() {
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
    const ordered_hashes = this.getSelectedFramesetHashesInOrder()
    const cur_index = ordered_hashes.indexOf(this.props.frameset_hash)
    if (cur_index > 0) {
      const next_hash = ordered_hashes[cur_index-1]
      this.props.setFramesetHash(next_hash)
      this.setUpImageParms(next_hash)
    }
  }

  gotoNextFrame() {
    const ordered_hashes = this.getSelectedFramesetHashesInOrder()
    const cur_index = ordered_hashes.indexOf(this.props.frameset_hash)
    if (cur_index < (ordered_hashes.length-1)) {
      const next_hash = ordered_hashes[cur_index+1]
      this.props.setFramesetHash(next_hash)
      this.setUpImageParms(next_hash)
    }
  }

  setUpImageParms(frameset_hash) {
    if (!Object.keys(this.props.movies).includes(this.state.active_movie_url)) {
      return ''
    }
    const next_frameset = this.props.movies[this.state.active_movie_url]['framesets'][frameset_hash]
    const next_img_url = next_frameset['images'][0]
    this.setImageSize(next_img_url)
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
        message: 'You will need to save changes to this JEO before they will have effect in the generation of the next Job Run Summary',
        message_class: 'primary',
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
        comment: '',
      }
    }
    deepCopyJrsm[this.state.active_movie_url]['framesets'][fsh][box_type][new_id] = new_box
    this.setState({
      jrs_movies: deepCopyJrsm,
      image_mode: new_mode,
    })
  }

  setReviewMovieComment(comment_string) {
    let deepCopyJrsm = JSON.parse(JSON.stringify(this.state.jrs_movies))
    deepCopyJrsm[this.state.active_movie_url]['comment'] = comment_string
    this.setState({
      jrs_movies: deepCopyJrsm,
    })
  }

  resetFrameReviewData() {
    let deepCopyJrsm = JSON.parse(JSON.stringify(this.state.jrs_movies))
    const fsh = this.props.frameset_hash
    if (Object.keys(this.state.jrs_movies[this.state.active_movie_url]['framesets']).includes(fsh)) {
      delete deepCopyJrsm[this.state.active_movie_url]['framesets'][fsh]
    }
    this.setState({
      jrs_movies: deepCopyJrsm,
      job_comment: '',
      message: 'frame review data has been cleared',
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
        comment: '',
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
      message: 'You will need to save changes to this JEO before they will have effect in the generation of the next Job Run Summary',
      message_class: 'primary',
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

    let build_obj = {
      mode: 'annotate',
      active_movie_url: movie_url,
      annotate_view_mode: annotate_view_mode,
    }
    if (annotate_view_mode === 'tile') {
      build_obj['message'] = "Select the frames you wish to annotate by clicking on them, press the Annotate button when done. Clicking on no frames gives you all frames of the movie to annotate."
    }

    this.setState(build_obj)
  }

  reviewExemplarMovie(movie_url, annotate_view_mode) {
    const fs_hash = this.getFirstFramesetHash(movie_url)
    this.props.setActiveMovieFirstFrame(movie_url, fs_hash)
    let build_obj = {
      mode: 'review',
      active_movie_url: movie_url,
      annotate_view_mode: annotate_view_mode,
    }
    this.setState(
      build_obj, 
      (()=>{this.setUpImageParms(fs_hash)})
    )
  }

  afterJeoSave(response_obj) {
    let jeo_id = ''
    if (Object.keys(response_obj).includes('id')) {
      jeo_id = response_obj['id']
    }
    function after_saved() {
      this.setMessage('Job Eval Objective has been saved', 'success')
    }
    this.getJobEvalObjectives(
      (() => {this.loadJeo(jeo_id, after_saved)})
    )
  }

  afterJeoDelete(response_obj, jeo_key_is_current) {
    if (jeo_key_is_current) {
      this.loadNewJeo(this.getJobEvalObjectives)
      this.setMessage('Job Eval Objective has been Deleted', 'success')
    } else {
      this.getJobEvalObjectives(
        (() => {this.setMessage('Job Eval Objective has been Deleted', 'success')})
      )
    }
  }

  getJeoFromState() {
    const build_content = {
      weight_false_pos: this.state.jeo_weight_false_pos,
      weight_false_neg: this.state.jeo_weight_false_neg,
      frame_passing_score: this.state.jeo_frame_passing_score,
      movie_passing_score: this.state.jeo_movie_passing_score,
      max_num_failed_frames: this.state.jeo_max_num_failed_frames,
      max_num_missed_entities_single_frameset: this.state.jeo_max_num_missed_entities_single_frameset,
      hard_fail_from_any_frame: this.state.jeo_hard_fail_from_any_frame,
      preserve_job_run_parameters: this.state.jeo_preserve_job_run_parameters,
      permanent_standards: this.state.jeo_permanent_standards,
    }
    const jeo = {
      id: this.state.jeo_id,
      description: this.state.jeo_description,
      content: build_content,
    }
    return jeo
  }

  loadJobRunSummaryDetails() {
    for (let i=0; i < this.state.jrs_ids_to_compare.length; i++) {
      const jrs_id = this.state.jrs_ids_to_compare[i]
      this.getOneJobRunSummary(jrs_id)
    }
  }

  async getOneJobRunSummary(jrs_id, when_done=(()=>{})) {
    let the_url = this.props.getUrl('job_run_summaries_url') + '/' + jrs_id
    await this.props.fetch(the_url, {
      method: 'GET',
      headers: this.props.buildJsonHeaders(),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      let deepCopyJrss = JSON.parse(JSON.stringify(this.state.job_run_summaries))
      let new_jrs = responseJson
      const content_obj = JSON.parse(new_jrs['content'])
      new_jrs['content'] = content_obj
      deepCopyJrss[jrs_id] = new_jrs
      this.setState({
        'job_run_summaries': deepCopyJrss,
       })
    })
    .then((responseJson) => {
      when_done(responseJson)
    })
    .catch((error) => {
      console.error(error);
    })
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

  loadJeo(jeo_id, when_done=(()=>{})) {
    const jeo = this.state.job_eval_objectives[jeo_id]
    this.setState({
      jeo_id: jeo.id,
      jeo_description: jeo.description,
      jeo_weight_false_pos: jeo.content.weight_false_pos,
      jeo_weight_false_neg: jeo.content.weight_false_neg,
      jeo_frame_passing_score: jeo.content.frame_passing_score,
      jeo_movie_passing_score: jeo.content.movie_passing_score,
      jeo_max_num_failed_frames: jeo.content.max_num_failed_frames,
      jeo_max_num_missed_entities_single_frameset: jeo.content.max_num_missed_entities_single_frameset,
      jeo_hard_fail_from_any_frame: jeo.content.hard_fail_from_any_frame,
      jeo_preserve_job_run_parameters: jeo.content.preserve_job_run_parameters,
      jeo_permanent_standards: jeo.content.permanent_standards,
      message: '',
    }, when_done)
  }

  loadNewJeo(when_done=(()=>{})) {
    this.setState({
      jeo_id: '',
      jeo_description: '',
      jeo_weight_false_pos: 1,
      jeo_weight_false_neg: 20,
      jeo_frame_passing_score: 70,
      jeo_movie_passing_score: 70,
      jeo_max_num_failed_frames: 2,
      jeo_max_num_missed_entities_single_frameset: 2,
      jeo_hard_fail_from_any_frame: false,
      jeo_preserve_job_run_parameters: true,
      jeo_permanent_standards: {},
      message: '',
    }, when_done)
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
            const deleting_current_key = (jeo_key === this.state.jeo_id)
            return (
              <button
                  className='dropdown-item'
                  key={index}
                  onClick={() => this.deleteJeoWithWarning(jeo_key, deleting_current_key)}
              >
                {the_name}
              </button>
            )
          })}
        </div>
      </div>
    )
  }
  
  deleteJeoWithWarning(jeo_key, deleting_current_key) {
    let resp = window.confirm("Are you sure you want to delete this Job Eval Objective?  Deleting it will also remove any associated Job Run Summaries")
    if (resp) {
      this.deleteJeo(jeo_key, ((resp)=>{this.afterJeoDelete(resp, deleting_current_key)}))
    }
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
    if (!this.state.jeo_id) {
      return ''
    }
    if (Object.keys(this.props.movies).length === 0) {
      return ''
    }
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
          Add Exemplar Movie
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
      this.setLocalStateVarAndWarn('jeo_permanent_standards', deepCopyPs)
    }
  }

  addExemplarMovie(movie_name, movie_url) {
    let deepCopyPs = JSON.parse(JSON.stringify(this.state.jeo_permanent_standards))
    deepCopyPs[movie_name] = {
      source_movie_url: movie_url,
      framesets: {},
    }
    this.setLocalStateVarAndWarn('jeo_permanent_standards', deepCopyPs)
  }

  buildJeoHelpButton() {
    const help_text = 'The Job Evaluation Object (JEO) is the top level organizational object for grouping and comparing the output from different job runs.  It represents the top level objective you wish to accomplish and allows you to customize how jobs are ranked when you compare their output.  Once a JEO has been established, you can perform several operations.  1) You can manually score the output from a job, this creates a Job Run Summary.  2) You can automatically score the output from a job, this also creates a Job Run Summary.  The movies used for automatically scoring are called Exemplar Movies, the desired output you define for those movies is called a Permanent Standard.  3)  You can compare up to four Job Run Summaries side by side.  Or, 4) you can specify the Permanent Standards used for automatic scoring'
    return (
      <button
          className='btn btn-primary'
          onClick={() => this.setMessage(help_text)}
      >
        ?
      </button>
    )
  }

  buildJeoSaveButton() {
    if (!this.state.something_changed) {
      return ''
    }
    return (
      <button
          className='btn btn-primary'
          onClick={() => this.saveJeo()}
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
      },
      anon_func
    )
  }

  setLocalStateVarAndWarn(var_name, var_value, when_done=(()=>{})) {
    function anon_func() {
      when_done()
    }
    this.setState(
      {
        [var_name]: var_value,
        something_changed: true,
        message: 'You will need to save changes to this JEO before they will have effect in the generation of the next Job Run Summary',
        message_class: 'primary',
      },
      anon_func
    )
  }

  componentDidMount() {
    this.getJobEvalObjectives()
    this.getJobRunSummaries()
    this.loadNewJeo()
    this.setMessage('select or create a Job Eval Objective to start.')
    window.addEventListener('keydown', this.keyPress)
  }

  buildExemplarMoviesSection() {
    if (!this.state.jeo_id) {
      return ''
    }
    let perm_standards = {}
    perm_standards = this.state.jeo_permanent_standards
    if (Object.keys(perm_standards).length === 0) {
      return (
        <div className='col font-italic'>
          this JEO has no exemplar movies
        </div>
      )
    }

    return (
      <div className='col'>
        <div className='row'>
          <div className='col-6 h5'>
            Exemplar Movies
          </div>
        </div>
        <div className='row'>
          <table className='table table-striped'>
            <thead>
              <tr>
                <td>movie name</td>
                <td>comments</td>
                <td></td>
                <td></td>
              </tr>
            </thead>
            <tbody>
            {Object.keys(perm_standards).map((movie_name, index) => {
              const perm_standard = this.state.jeo_permanent_standards[movie_name]
              const source_movie_url = perm_standard['source_movie_url']
              let comment = ''
              if (Object.keys(perm_standard).includes('comment')) {
                comment = perm_standard['comment']
              }
              return (
                <tr key={index}>
                  <td>
                    {movie_name}
                  </td>
                  <td>
                    {comment}
                  </td>
                  <td>
                    <button
                      className='btn btn-link ml-2 p-0'
                      onClick={()=>{this.annotateExemplarMovie(source_movie_url, 'tile')}}
                    >
                      annotate
                    </button>
                  </td>
                  <td>
                    <button
                      className='btn btn-link ml-2 p-0'
                      onClick={()=>{this.removeExemplarMovie(movie_name)}}
                    >
                      delete
                    </button>
                  </td>
                </tr>
              )
            })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  buildJobEvalObjectivePanel() {
    const load_button = this.buildJeoLoadButton()
    const save_button = this.buildJeoSaveButton()
    const help_button = this.buildJeoHelpButton()
    const delete_button = this.buildJeoDeleteButton()
    const add_exemplar_button = this.buildAddExemplarMovieButton()
    const weight_false_pos_field = this.buildJeoWeightFalsePosField()
    const weight_false_neg_field = this.buildJeoWeightFalseNegField()
    const max_num_failed_frames_field = this.buildJeoMaxNumFailedFramesField() 
    const max_num_missed_entities_field = this.buildJeoMaxNumMissedEntitiesField()
    const movie_passing_score_field = this.buildJeoMoviePassingScoreField() 
    const frame_passing_score_field = this.buildJeoFramePassingScoreField()
    const hard_fail_any_frame_field = this.buildHardFailAnyFrameField()
    const preserve_job_run_parameters_field = this.buildPreserveJobRunParametersField()
    const exemplar_movies_section = this.buildExemplarMoviesSection()
    let show_hide_details = ''
    if (this.state.jeo_id) {
      show_hide_details = makePlusMinusRowLight('details', 'jeo_details')
    }

    return (
      <div className='col-9 pb-4 mb-4 mt-2'>
        <div id='objective_div row'>
          <div className='col'>
            <div className='row h3'>
              <div className='d-inline'>
                Job Eval Objective: General Info
              </div>
              <div className='d-inline ml-4'>
                {load_button}
              </div>
              <div className='d-inline ml-2'>
                {save_button}
              </div>
              <div className='d-inline ml-2'>
                {delete_button}
              </div>
              <div className='d-inline ml-2'>
                {add_exemplar_button}
              </div>
              <div className='d-inline ml-2'>
                {help_button}
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
    
            <div className='row ml-2 mt-2'>
              <div className='col'>
                <div className='row'>
                  <div className='d-inline'>
                    Description:
                  </div>
                  <div className='d-inline text-danger ml-5'>
                    * Required
                  </div>
                </div>
                <div className='row'>
                  <div
                      className='d-inline'
                  >
                    <textarea
                      id='jeo_description'
                      cols='60'
                      rows='3'
                      value={this.state.jeo_description}
                      onChange={(event) => this.setLocalStateVarAndWarn('jeo_description', event.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className='row mt-2'>
              {exemplar_movies_section}
            </div>

            {show_hide_details}
            <div
                id='jeo_details'
                className='collapse row'
            >
              <div className='col border-bottom'>
                <div className='row ml-4 font-italic'>
                   Score = 100 - 100*(f_pos_weight * (f_pos_pixels/tot_pixels)) - 100*(f_neg_weight * (f_neg_pixels/tot_pixels))
                </div>
                
                <div className='row m-1'>
                  {weight_false_pos_field}
                </div>

                <div className='row m-1'>
                  {weight_false_neg_field}
                </div>

                <div className='row m-1'>
                  {max_num_failed_frames_field} 
                </div>

                <div className='row m-1'>
                  {max_num_missed_entities_field} 
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
              </div>
            </div>

          </div>
        </div>


      </div>
    )
  }

  saveJeo(when_done=(()=>{})) {
    const jeo_object = this.getJeoFromState()
    this.saveJobEvalObjective(jeo_object, this.afterJeoSave)
    this.setState({
      something_changed: false,
    })
  }

  buildDividerGradient() {
    if (!this.state.jeo_id) {
      return ''
    }
    const gradient_style = {
      backgroundImage: 'linear-gradient(to bottom right, #D4DAF8, #D4F9C8)',
      height: '15px',
      borderRadius: '25px'
    }
    return (
      <div className='col-12' style={gradient_style}>
      </div>
    )
  }

  buildHomePanel() {
    const job_eval_objective_data = this.buildJobEvalObjectivePanel()
    const job_run_summary_section = this.buildJobRunSummarySection()
    const gradient_div = this.buildDividerGradient()
    return (
      <div className='col'>
        <div className='row mt-2'>
          {job_eval_objective_data}
        </div>

        <div className='row mt-2 mr-1'>
          {gradient_div}
        </div>

        <div className='row mt-2'>
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
      ((value)=>{this.setLocalStateVarAndWarn('ocr_job_id', value)})
    )
  }

  buildShowOcrButton() {
    if (!this.state.ocr_job_id) {
      return ''
    }
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.setLocalStateVarAndWarn('show_ocr', true)}}
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
        onClick={()=>{this.setLocalStateVarAndWarn('show_ocr', false)}}
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

  buildAddSameAnnotationsAsPrevFramesetButton() {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.addSameAnnotationsAsPrevFrame()}}
      >
        Duplicate Prev (^)
      </button>
    )
  }

  buildCopyCurrentAnnotationsFramesetButton() {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.setState({copied_frameset_hash: this.props.frameset_hash})}}
      >
        Copy current
      </button>
    )
  }

  buildPasteAnnotationFramesetButton() {
    if (!this.state.copied_frameset_hash) {
      return ''
    }
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.pasteAnnotation()}}
      >
        Paste
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
        Back to Job Summary View
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
    const next_text = 'Next (>)'
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.gotoNextFrame()}}
      >
        {next_text}
      </button>
    )
  }

  buildPrevFrameButton() {
    const prev_text = 'Prev (<)'
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.gotoPrevFrame()}}
      >
        {prev_text}
      </button>
    )
  }

  buildAnnotateResetButton() {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.resetFrameAnnotateData()}}
      >
        Reset
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

  buildAnnotateMovieCommentsRow() {
    let movie_comments_row = ''
    if (this.state.mode === 'annotate') {
      let comment_val = ''
      const movie_name = getFileNameFromUrl(this.state.active_movie_url)
      if (
        Object.keys(this.state.jeo_permanent_standards).includes(movie_name) &&
        Object.keys(this.state.jeo_permanent_standards[movie_name]).includes('comment')
      ) {
        comment_val = this.state.jeo_permanent_standards[movie_name]['comment']
      }

      movie_comments_row = (
        <div className='row mt-2'>
          <div className='d-inline'>
            Movie Level Comments
          </div>
          <div className='d-inline ml-2'>
            <textarea
              id='movie_level_comment'
              cols='60'
              rows='3'
              value={comment_val}
              onChange={(event) => this.setAnnotateMovieComment(event.target.value)}
            />
          </div>
        </div>
      )
    } else if (this.state.mode === 'review') {
      let comment_val = ''
      if (
        Object.keys(this.state.jrs_movies[this.state.active_movie_url]).includes('comment') && 
        this.state.jrs_movies[this.state.active_movie_url]['comment']
      ) {
        comment_val = this.state.jrs_movies[this.state.active_movie_url]['comment']
      }
      
      movie_comments_row = (
        <div className='row mt-2'>
          <div className='d-inline'>
            Movie Level Comments
          </div>
          <div className='d-inline ml-2'>
            <textarea
              id='movie_level_comment'
              cols='60'
              rows='3'
              value={comment_val}
              onChange={(event) => this.setReviewMovieComment(event.target.value)}
            />
          </div>
        </div>
      )
    }
    return movie_comments_row
  }


  buildAnnotatePanelTile() {
    const tile_info = this.getTileInfo()
    const num_cols = tile_info['num_cols']
    const col_class = tile_info['col_class']
    const ordered_hashes = this.props.getFramesetHashesInOrder()
    const num_rows = Math.ceil(ordered_hashes.length / num_cols)
//    const col_count_picker = this.buildAnnotateTileColumnCountDropdown()
    const col_count_picker = ''
    let review_annotate_when_clicked = (()=>{this.annotateExemplarMovie(this.state.active_movie_url, 'single')})
    let review_annotate_button_label = 'Annotate these Frames'
    let help_button = this.buildAnnotateTileHelpButton()
    const movie_comments_row = this.buildAnnotateMovieCommentsRow()
    if (this.state.mode === 'review') {
      help_button = this.buildReviewTileHelpButton()
      review_annotate_button_label = 'Review these Frames'
      review_annotate_when_clicked = (()=>{this.reviewExemplarMovie(this.state.active_movie_url, 'single')})
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

          {movie_comments_row}

          <div className='row'>
            <div className='d-inline'>
              <button
                className='btn btn-primary'
                onClick={review_annotate_when_clicked}
              >
                {review_annotate_button_label}
              </button>
            </div>
            <div className='d-inline ml-2'>
              {back_to_jrs_summary_button}
            </div>
            <div className='d-inline ml-2'>
              {help_button}
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
        onClick={()=>{this.resetFrameReviewData()}}
      >
        Reset
      </button>
    )
  }

  buildReviewTileHelpButton() {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.setMessage('This is the Tile View mode of the Manual Review page for a single movie.  From this page, you optionally select the frames you are interested in reviewing, then you will press the Review these Frames button to begin work.  You will be presented with a full screen view of the first frame in Review - Single Frame mode.  You can specify if it passes or fails, or you can specify desired areas that were or were not selected by the job. You can advance between frames with the Prev and Next buttons but the right and left arrows on your keyboard should work too. When done reviewing the movie, you will submit your work to be Finalized into a permanent Job Run Summary record.')}}
      >
        ?
      </button>
    )
  }

  buildAnnotateTileHelpButton() {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.setMessage('This is the Tile View mode of the Annotate page for a single movie.  It presents you with an overview of all the framesets for the movie you have selected to annotate.  From here you can optionally select some framesets by clicking on them, then pressing the Annotate these Frames button will take you to a Single frame view of the first frameset, where you can begin specifying information.  When that work is completed, the Home button will take you to the main screen, where you can Save your changes to the Job Eval Objective record.')}}
      >
        ?
      </button>
    )
  }

  buildAnnotateSingleHelpButton() {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.setMessage('This is the Single Frame View mode of the Annotate page for a single movie.  From this page you can specify how the output from a perfect version of the tool youre designing would look.  Besides navigating using the buttons above, the left and right arrows will advance you sequentially between frames.  The up arrow key will copy the contents of the frame immediately before this one and add them to the current frame.  When you are done annotating individual frames, use the Home button to get back to the main screen, then press the Save button to add these annotations as a permanent part of the Job Eval Objective record.')}}
      >
        ?
      </button>
    )
  }

  buildReviewSingleHelpButton() {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.setMessage('A number of rules are applicable when reviewing a single frame of a jobs output.  1) If you specify nothing, PASS is assumed, 2) if you FAIL a job, it is assumed that all the detected areas from the job were done in error, and the opposite of that - all areas that were missed - were things you wanted to see in the results.  Job score will be zero.  3) You can specify Desired and Unwanted regions.  Those will be used to score the job results, ultimately calculating the areas of missed-but-wanted (false negative) and returned-but-not-wanted (false positive) regions, and scoring them with the weights and formula indicated in the details of the Job Eval Objective record.  If the record receives any Desired/Unwanted markup and does not a simple PASS/FAIL score, it will be scored with the weights and thresholds specified on the JEO.  Scores and PASS/FAIL grades are accumulated across all the frames of all the movies of the jobs, and can pass or fail the movie or entire job, according to thresholds established in the Job Eval Objective record.')}}
      >
        ?
      </button>
    )
  }


  buildBackToReviewJrsMovieButton(movie_url) {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.showReviewTile(movie_url)}}
      >
        Back to Tile View
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
    const help_button = this.buildReviewSingleHelpButton()

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

        <div className='d-inline ml-1'>
          {help_button}
        </div>

      </div>
    )
  } 

  buildAnnotateSingleButtons() {
    const add_box_button = this.buildAddBoxButton()
    const delete_box_button = this.buildDeleteBoxButton()
    const add_same_as_prev_frame_button = this.buildAddSameAnnotationsAsPrevFramesetButton()
    const copy_button = this.buildCopyCurrentAnnotationsFramesetButton()
    const paste_button = this.buildPasteAnnotationFramesetButton()
    const show_ocr_button = this.buildShowOcrButton()
    const hide_ocr_button = this.buildHideOcrButton()
    const add_ocr_button = this.buildAddOcrButton()
    const delete_ocr_button = this.buildDeleteOcrButton()
    const next_frame_button = this.buildNextFrameButton()
    const prev_frame_button = this.buildPrevFrameButton()
    const reset_button = this.buildAnnotateResetButton()
    const back_to_tile_button = this.buildBackToTileButton()
    const help_button = this.buildAnnotateSingleHelpButton()
    return (
      <div>
        <div className='d-inline ml-1'>
          {add_box_button}
        </div>

        <div className='d-inline ml-1'>
          {delete_box_button}
        </div>

        <div className='d-inline ml-1'>
          {reset_button}
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
          {add_same_as_prev_frame_button}
        </div>

        <div className='d-inline ml-1'>
          {copy_button}
        </div>

        <div className='d-inline ml-1'>
          {paste_button}
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

        <div className='d-inline ml-1'>
          {help_button}
        </div>
      </div>
    )
  }

  buildFramesetCommentsInputRow() {
    let fs_comment = ''
    const fsh = this.props.frameset_hash
    if (
      Object.keys(this.state.jrs_movies[this.state.active_movie_url]['framesets']).includes(fsh) &&
      Object.keys(this.state.jrs_movies[this.state.active_movie_url]['framesets'][fsh]).includes('comment')
    ) {
      fs_comment = this.state.jrs_movies[this.state.active_movie_url]['framesets'][fsh]['comment']
    }
    return (
      <div className='row mt-2'>
        <div className='d-inline'>
          Frameset Comments
        </div>
        <div className='d-inline ml-2'>
          <textarea
            id='frameset_comment'
            cols='60'
            rows='3'
            value={fs_comment}
            onChange={(event) => this.setFramesetComment(event.target.value)}
          />
        </div>
      </div>
    )
  }

  setFramesetComment(comment_string) {
    let deepCopyJrsm = JSON.parse(JSON.stringify(this.state.jrs_movies))
    if (!Object.keys(this.state.jrs_movies[this.state.active_movie_url]['framesets']).includes(this.props.frameset_hash)) {
      deepCopyJrsm[this.state.active_movie_url]['framesets'][this.props.frameset_hash] = {
        desired: {},
        unwanted: {},
        pass_or_fail: '',
        comment: '',
      }
    }
    deepCopyJrsm[this.state.active_movie_url]['framesets'][this.props.frameset_hash]['comment'] = comment_string
    this.setState({
      jrs_movies: deepCopyJrsm,
    })
    
  }

  buildAnnotatePanelSingle() {
    const image_url = this.props.getImageUrl()
    const image_element = this.buildImageElement(image_url)
    let buttons_row = ''
    let frameset_comments_row = ''
    if (this.state.mode === 'annotate') {
      buttons_row = this.buildAnnotateSingleButtons()
    } else if (this.state.mode === 'review') {
      buttons_row = this.buildReviewSingleButtons()
      frameset_comments_row = this.buildFramesetCommentsInputRow()
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

          {frameset_comments_row}

          <div style={extra_text_style} className='row'>
            {image_extra_text}
          </div>

          <div id='annotate_image_div' className='row'>
            {image_element}
            <CanvasAnnotateOverlay
              image_width={this.state.image_width}
              image_height={this.state.image_height}
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

  buildManualJobPicker() {
    const jobs = [{'': ''}]
    for (let i=0; i < this.props.jobs.length; i++) {
      const job = this.props.jobs[i]
      if (
        job.app === 'analyze' ||
        job.app === 'pipeline'
      ) {
        const build_obj = {}
        build_obj[job.id] = job.id.substring(0, 5) + '... - ' + job.description
        jobs.push(build_obj)
      }
    }

    const job_id_dropdown = buildLabelAndDropdown(
      jobs,
      'Job Id',
      this.state.active_job_id,
      'active_job_id',
      ((value)=>{this.setState({'active_job_id': value})})
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
      this.loadJobRunSummaryDetails()
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
        Build Manual Summary
      </button>
    )
  }

  sendInManualJob() {
    this.setState({
      finalize_manual_submitted: true,
    })
    this.submitJobEvalJob('build_manual_job_run_summary')
  }


  buildSendInManualJrsButton() {
    return (
      <button
        className='btn btn-primary'
        onClick={()=>{this.sendInManualJob()}}
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
    let build_obj = {
      mode: 'review',
      annotate_view_mode: 'tile',
      active_movie_url: movie_url,
      message: "Select the frames you wish to review by clicking on them, press the Review button when done. Clicking on no frames gives you all frames of the movie to review.",
    }
    this.setState(build_obj)
  }

  showReviewSummary(first_loading_of_this_job=false) {
    let match_found = false
    for (let i=0; i < Object.keys(this.props.tier_1_matches).length; i++) {
      const scanner_type = Object.keys(this.props.tier_1_matches)[i]
      for (let j=0; j < Object.keys(this.props.tier_1_matches[scanner_type]).length; j++) {
        const match_key = Object.keys(this.props.tier_1_matches[scanner_type])[j]
        const match_obj = this.props.tier_1_matches[scanner_type][match_key]
        if (
          Object.keys(match_obj).includes('job_id') &&
          match_obj['job_id'] === this.state.active_job_id
        ) {
          match_found = true
          const movie_urls = Object.keys(match_obj['movies'])
          let build_jrs_movies = {}
          for (let k=0; k < movie_urls.length; k++) {
            const movie_url = movie_urls[k]
            build_jrs_movies[movie_url] = {
              'framesets': {},
            }
          }

          let build_obj = {
            mode: 'review',
            annotate_view_mode: 'summary',
            active_t1_results_key: match_key,
            active_t1_scanner_type: scanner_type,
          }
          if (first_loading_of_this_job) {
            build_obj['jrs_movies'] = build_jrs_movies
            build_obj['finalize_manual_submitted'] = false
          }
          this.setState(build_obj)
          return
        }
      }
    }
    if (!match_found) {
      this.props.loadJobResults(this.state.active_job_id)
      this.setMessage('please wait a moment, loading the job results.  you will be redirected when complete')
      this.doSleep(5000).then(() => {
        this.setMessage('Job output has been loaded.  Next, you need to review the movies below.  You can also delete movies that are not of interest, they will be omitted from the analysis.  When you are done reviewing all the movies of interest, you will finish by finalizing this review data - that is submitting it to the server so that charts and statistics can be prepared and assembled into a Job Run Summary.')
        return this.showReviewSummary(first_loading_of_this_job)
      });
    }
  }

doSleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
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

  getJobRunSummariesForActiveJeo() {
    if (!this.state.jeo_id) {
      return {}
    }
    let build_obj = {}
    for (let i=0; i < Object.keys(this.state.job_run_summaries).length; i++) {
      const jrs_id = Object.keys(this.state.job_run_summaries)[i]
      const jrs = this.state.job_run_summaries[jrs_id]
      if (jrs['job_eval_objective_id'] === this.state.jeo_id) {
        build_obj[jrs_id] = jrs
      }
    }
    return build_obj
  }

  buildJobRunSummaryList() {
    const job_run_summaries = this.getJobRunSummariesForActiveJeo()
    if (!job_run_summaries || Object.keys(job_run_summaries).length === 0) {
      return (
        <div className='font-italic'>
          no job run summaries found
        </div>
      )
    }
    if (!this.state.jeo_id) {
      return ''
    }
    const compare_button = this.buildCompareButton()
    const delete_button= this.buildJrsDeleteButton()
    return (
      <table className='table table-striped'>
        <thead>
          <tr>
            <td>Job Id</td>
            <td>Type</td>
            <td>Score</td>
            <td>Movies</td>
            <td>Created On</td>
            <td>{compare_button}</td>
            <td>{delete_button}</td>
          </tr>
        </thead>
        <tbody>
        {Object.keys(job_run_summaries).map((jrs_key, index) => {
          const jrs = job_run_summaries[jrs_key]
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
            <tr key={index} >
              <td>
                {job_id_short}
              </td>
              <td>
                {jrs.summary_type}
              </td>
              <td>
                {jrs.score}
              </td>
              <td>
                {movie_names_div}
              </td>
              <td>
                {jrs.created_on}
              </td>
              <td>
                <input
                  className='ml-2 mr-2 mt-1'
                  checked={compare_checked}
                  type='checkbox'
                  onChange={
                    () => this.addRemoveToJrsIdsToCompare(jrs_key) 
                  }
                />
              </td>
              <td>
                <input
                  className='ml-2 mr-2 mt-1'
                  checked={delete_checked}
                  type='checkbox'
                  onChange={
                    () => this.addRemoveToJrsIdsToDelete(jrs_key) 
                  }
                />
              </td>
            </tr>
          )
        })}
        </tbody>
      </table>
    )
  }

  buildJobRunSummarySection() {
    if (!this.state.jeo_id) {
      return ''
    }

    const manual_job_picker = this.buildManualJobPicker()
    const generate_exemplar_button = this.buildGenerateExemplarJrsButton()
    const manual_review_button = this.buildManualJrsButton()
    const jrs_list = this.buildJobRunSummaryList()
//    const get_jrs_button = this.buildGetJrsListButton()
    const get_jrs_button = ''
    return (
      <div className='row'>
        <div className='col'>
          <div className='row h3'>
            <div className='col-8'>
              Job Run Summaries
            </div>
            <div className='col-4'>
              {get_jrs_button}
            </div>
          </div>

          <div className='row mt-4'>
            <div className='col-6 rounded border'>
              <div className='row mt-4 ml-2 h4'>
                Generate Summaries
              </div>
              <div className='row mt-4 ml-2'>
                {manual_job_picker}
              </div>

              <div className='row mb-4  mt-2 ml-2'>
                <div className='d-inline ml-2'>
                  {manual_review_button}
                </div>
                <div className='d-inline ml-2'>
                  {generate_exemplar_button}
                </div>
              </div>
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

  buildYouCanFinalizeRow(movie_urls) {
    let send_to_api_button = ''
    let submit_message = ''
    for (let i=0; i < movie_urls.length; i++) {
      const movie_url = movie_urls[i]
      if (
        Object.keys(this.state.jrs_movies).includes(movie_url) &&
        Object.keys(this.state.jrs_movies[movie_url]['framesets']).length > 0 &&
        !this.state.finalize_manual_submitted
      ) {
        submit_message = 'manual job mark up has been saved, press the Finalize button to initiate the creation of a Job Run Summary'
        send_to_api_button = this.buildSendInManualJrsButton()
      }
    }
    if (!submit_message) {
      return ''
    }
    return (
      <div className='row'>
        <div className='col'>
          <div className='row alert alert-primary'>
            <div className='d-inline h5'>
              {submit_message}
            </div>
            <div className='d-inline ml-2 mt-0'>
              {send_to_api_button}
            </div>
          </div>
        </div>
      </div>
    )
  }

  buildReviewPanelSummary() {
    const movie_urls = this.getMovieUrlsForActiveJob()
    const you_can_finalize_row = this.buildYouCanFinalizeRow(movie_urls)
    return (
      <div className='row'>
        <div className='col'>

          {you_can_finalize_row}

          <div className='row mt-2'>
            <div className='d-inline'>
              Job Level Comments
            </div>
            <div className='d-inline ml-2'>
              <textarea
                id='job_level_comment'
                cols='60'
                rows='3'
                value={this.state.job_comment}
                onChange={(event) => this.setState({'job_comment': event.target.value})}
              />
            </div>
          </div>

          <div className='row'>
            <table className='table table-striped'>
              <thead>
                <tr>
                  <td>Movie Name</td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              </thead>
              <tbody>
              {movie_urls.map((movie_url, index) => {
                const movie_name = getFileNameFromUrl(movie_url)
                const delete_movie_button = this.buildDeleteJrsMovieButton(movie_url)
                const review_movie_button = this.buildReviewJrsMovieButton(movie_url)
                let summary_info = 'no review data found'
                if (
                  Object.keys(this.state.jrs_movies).includes(movie_url) &&
                  Object.keys(this.state.jrs_movies[movie_url]['framesets']).length > 0
                ) {
                  summary_info = 'reviewed'
                }
                return (
                  <tr key={index}>
                    <td>
                      {movie_name}
                    </td>
                    <td>
                      {summary_info}
                    </td>
                    <td>
                      {delete_movie_button}
                    </td>
                    <td>
                      {review_movie_button}
                    </td>
                  </tr>
               )
              })}
              </tbody>
            </table>
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
      the_title = 'Summary View for Job ' + this.state.active_job_id
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

  setReviewComment(comment_type, comment_string) {
    let deepCopyJrsm = JSON.parse(JSON.stringify(this.state.jrs_movies))
    if (comment_type === 'job_level') {
      if (!Object.keys(deepCopyJrsm).includes('general')) {
        deepCopyJrsm['general'] = {notes: ''}
      }
      deepCopyJrsm['general']['notes'] = comment_string
    }
    this.setState({
      jrs_movies: deepCopyJrsm,
    })
  }

  buildComparePanel() {
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

  buildDisplayMessageString() {
    let message = '.'
    let message_style = {'color': 'white'}
    let message_class = 'col-6'
    if (this.state.message) {
      message = this.state.message
    }
    if (message !== '.') {
      message_style['color'] = 'black'
      message_class = 'col-6 alert alert-' + this.state.message_class
    }
    return {
      message_text: message,
      message_class: message_class,
      message_style: message_style,
    }
  }

  reviewDataExists() {
    let has_review_data = false
    for (let i=0; i < Object.keys(this.state.jrs_movies).length; i++) {
      const movie_url = Object.keys(this.state.jrs_movies)[i]
      if (Object.keys(this.state.jrs_movies[movie_url]['framesets']).length > 0) {
        has_review_data = true
      }
    }
    return has_review_data
  }

  goHomeWithWarning() {
    let resp = window.confirm('If you go to the Home Panel from here, you will lose any work you have done with manually reviewing movies.  Are you sure you want to go the home panel?')
    if (resp) {
      this.setState({'mode': ''})
    }
  }

  buildHomeButton() {
    if (!this.state.mode) {
      return ''
    }

    let action_func = (() => {this.setState({'mode': ''})})
    if (
      this.state.mode === 'review' && 
      this.reviewDataExists() &&
      !this.state.finalize_manual_submitted
    ) {
      action_func = (() => {this.goHomeWithWarning()})
    }

    return (
      <button
        className='btn btn-primary'
        onClick={action_func}
      >
        home
      </button>
    )
  }

  buildClearMessageButton(the_message) {
    if (!the_message || the_message === '.') {
      return ''
    }
    return (
      <button
        className='btn btn-link ml-4'
        onClick={() => {this.setMessage('')}}
      >
        clear message
      </button>
    )
  }

  render() {
    const home_button = this.buildHomeButton()
    const message_obj = this.buildDisplayMessageString()
    const message = message_obj['message_text']
    const message_style = message_obj['message_style']
    const message_class = message_obj['message_class']
    const clear_message_button = this.buildClearMessageButton(message)
    let title = 'Job Evaluation - Home'
    let page_content = ''
    if (!this.state.mode || this.state.mode === 'home') {
      page_content = this.buildHomePanel()
    } else if (this.state.mode === 'annotate') {
      page_content = this.buildAnnotatePanel()
      title = 'Job Evaluation - Annotate Exemplar Movie'
    } else if (this.state.mode === 'review') {
      page_content = this.buildReviewPanel()
      title = 'Job Evaluation - Manual Review of Job Output'
    } else if (this.state.mode === 'compare') {
      title = 'Job Eval - Compare Job Run Summaries'
//      page_content = this.buildComparePanel()
      page_content = (
        <JobEvalCompareControls
            jrs_ids_to_compare={this.state.jrs_ids_to_compare}
            compare_single_mode_data={this.state.compare_single_mode_data}
            job_run_summaries={this.state.job_run_summaries}
            getFramesetHashesInOrder={this.props.getFramesetHashesInOrder}
        />
      )
    }
    return (
      <div className='col ml-2'>
        <div className='row h2'>
          <div className='col-9'>
            {title}
          </div>
          <div className='col-3'>
            {home_button}
          </div>
        </div>

        <div style={message_style} className='row'>
          <div className={message_class}>
            <div className='font-italic'>
              {message}
            </div>
          </div>
          <div>
            {clear_message_button}
          </div>
        </div>

        <div className='row'>
          {page_content}
        </div>
      </div>
    )
  }
}

export default JobEvalPanel;
