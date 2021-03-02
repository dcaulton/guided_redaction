import React from 'react';
import {
  getFileNameFromUrl
} from './redact_utils.js'
import {
  makePlusMinusRowLight,
  buildLabelAndTextInput,
} from './SharedControls'

class JobEvalJeoLogic extends React.Component {

  constructor(props) {
    super(props)
    this.afterJeoSave=this.afterJeoSave.bind(this)
    this.saveJeo=this.saveJeo.bind(this)
  }

  componentDidMount() {
    this.props.addJobEvalCallback('saveJeo', this.saveJeo)
  }

  removeExemplarMovie(movie_name) {
    let deepCopyPs = JSON.parse(JSON.stringify(this.props.jeo_permanent_standards))
    if (Object.keys(deepCopyPs).includes(movie_name)) {
      delete deepCopyPs[movie_name]
      this.props.setLocalStateVarAndWarn('jeo_permanent_standards', deepCopyPs)
    }
  }

  buildExemplarMoviesSection() {
    if (!this.props.jeo_id) {
      return ''
    }
    let perm_standards = {}
    perm_standards = this.props.jeo_permanent_standards
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
              const perm_standard = this.props.jeo_permanent_standards[movie_name]
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
                      onClick={()=>{this.props.annotateExemplarMovie(source_movie_url, 'tile')}}
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

  buildPreserveJobRunParametersField() {
    let checked_value = ''
    if (this.props.jeo_preserve_job_run_parameters) {
      checked_value = 'checked'
    }
    return (
      <div>
        <div className='d-inline'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={checked_value}
            type='checkbox'
            onChange={() => this.props.setLocalStateVarAndWarn(
              'jeo_preserve_job_run_parameters', !this.props.jeo_preserve_job_run_parameters
            )}
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
    if (this.props.jeo_hard_fail_from_any_frame) {
      checked_value = 'checked'
    }
    return (
      <div>
        <div className='d-inline'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={checked_value}
            type='checkbox'
            onChange={() => this.props.setLocalStateVarAndWarn(
              'jeo_hard_fail_from_any_frame', !this.props.jeo_hard_fail_from_any_frame
            )}
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
      this.props.jeo_frame_passing_score,
      'Frame Passing Score (0-100)',
      'jeo_frame_passing_score',
      'jeo_frame_passing_score',
      4,
      ((value)=>{this.props.setLocalStateVarAndWarn('jeo_frame_passing_score', value)})
    )
  }

  buildJeoMoviePassingScoreField() {
    return buildLabelAndTextInput(
      this.props.jeo_movie_passing_score,
      'Movie Passing Score (0-100)',
      'jeo_movie_passing_score',
      'jeo_movie_passing_score',
      4,
      ((value)=>{this.props.setLocalStateVarAndWarn('jeo_movie_passing_score', value)})
    )
  }

  buildJeoMaxNumFailedFramesField() {
    return buildLabelAndTextInput(
      this.props.jeo_max_num_failed_frames,
      'Max Num of Failed Frames',
      'jeo_max_num_failed_frames',
      'jeo_max_num_failed_frames',
      4,
      ((value)=>{this.props.setLocalStateVarAndWarn('jeo_max_num_failed_frames', value)})
    )
  }

  buildJeoMaxNumMissedEntitiesField() {
    return buildLabelAndTextInput(
      this.props.jeo_max_num_missed_entities_single_frameset,
      'Max Num of Missed Entities In a Single Frame',
      'jeo_max_num_missed_entities_single_frameset',
      'jeo_max_num_missed_entities_single_frameset',
      4,
      ((value)=>{this.props.setLocalStateVarAndWarn('jeo_max_num_missed_entities_single_frameset', value)})
    )
  }

  buildJeoWeightFalsePosField() {
    return buildLabelAndTextInput(
      this.props.jeo_weight_false_pos,
      'False Positive Weight',
      'jeo_weight_false_pos',
      'jeo_weight_false_pos',
      4,
      ((value)=>{this.props.setLocalStateVarAndWarn('jeo_weight_false_pos', value)})
    )
  }

  buildJeoWeightFalseNegField() {
    return buildLabelAndTextInput(
      this.props.jeo_weight_false_neg,
      'False Negative Weight',
      'jeo_weight_false_neg',
      'jeo_weight_false_neg',
      4,
      ((value)=>{this.props.setLocalStateVarAndWarn('jeo_weight_false_neg', value)})
    )
  }

  addExemplarMovie(movie_name, movie_url) {
    let deepCopyPs = JSON.parse(JSON.stringify(this.props.jeo_permanent_standards))
    deepCopyPs[movie_name] = {
      source_movie_url: movie_url,
      framesets: {},
    }
    this.props.setLocalStateVarAndWarn('jeo_permanent_standards', deepCopyPs)
  }

  buildAddExemplarMovieButton() {
    if (!this.props.jeo_id) {
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
              Object.keys(this.props.jeo_permanent_standards).includes(movie_name)) {
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

  afterJeoDelete(response_obj, jeo_key_is_current) {
    if (jeo_key_is_current) {
      this.loadNewJeo(this.props.getJobEvalObjectives)
      this.props.setMessage('Job Eval Objective has been Deleted', 'success')
    } else {
      this.props.getJobEvalObjectives(
        (() => {this.props.setMessage('Job Eval Objective has been Deleted', 'success')})
      )
    }
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

  buildJeoDeleteButton() {
    const jeo_keys = Object.keys(this.props.job_eval_objectives)
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
            const jeo = this.props.job_eval_objectives[jeo_key]
            const the_name = jeo['description']
            const deleting_current_key = (jeo_key === this.props.jeo_id)
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

  buildJeoHelpButton() {
    const help_text = [
      'The Job Evaluation Object (JEO) is the top level organizational object for grouping and comparing the output from different job runs.  It represents the top level objective you wish to accomplish and allows you to customize how jobs are ranked when you compare their output.  ',
      'Once a JEO has been established, you can perform several operations.  ',
      '1) You can manually score the output from a job, this creates a Job Run Summary.  ',
      '2) You can automatically score the output from a job, this also creates a Job Run Summary.  The movies used for automatically scoring are called Exemplar Movies, the desired output you define for those movies is called a Permanent Standard.  ',
      '3)  You can compare up to four Job Run Summaries side by side.  Or, ',
      '4) you can specify the Permanent Standards used for automatic scoring'
    ]
    return (
      <button
          className='btn btn-primary'
          onClick={() => this.props.setMessage(help_text)}
      >
        ?
      </button>
    )
  }

  afterJeoSave(response_obj) {
    let jeo_id = ''
    if (Object.keys(response_obj).includes('id')) {
      jeo_id = response_obj['id']
    }
    function after_saved() {
      this.props.setMessage('Job Eval Objective has been saved', 'success')
      this.props.setLocalStateVar({
        message: 'Job Eval Objective has been saved', 
        message_class: 'success',
        something_changed: false,
        jeo_id: jeo_id,
      })
    }
    this.props.getJobEvalObjectives(
      (() => {this.loadJeo(jeo_id, after_saved)})
    )
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

  getJeoFromState() {
    const build_content = {
      weight_false_pos: this.props.jeo_weight_false_pos,
      weight_false_neg: this.props.jeo_weight_false_neg,
      frame_passing_score: this.props.jeo_frame_passing_score,
      movie_passing_score: this.props.jeo_movie_passing_score,
      max_num_failed_frames: this.props.jeo_max_num_failed_frames,
      max_num_missed_entities_single_frameset: this.props.jeo_max_num_missed_entities_single_frameset,
      hard_fail_from_any_frame: this.props.jeo_hard_fail_from_any_frame,
      preserve_job_run_parameters: this.props.jeo_preserve_job_run_parameters,
      permanent_standards: this.props.jeo_permanent_standards,
    }
    const jeo = {
      id: this.props.jeo_id,
      description: this.props.jeo_description,
      content: build_content,
    }
    return jeo
  }

  saveJeo() {
    const jeo_object = this.getJeoFromState()
    this.saveJobEvalObjective(jeo_object, this.afterJeoSave)
  }

  buildJeoSaveButton() {
    if (!this.props.something_changed) {
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

  loadNewJeo(when_done=(()=>{})) {
    this.props.setLocalStateVar({
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
      something_changed: false,
      message: '',
    }, when_done)
  }

  loadJeo(jeo_id, when_done=(()=>{})) {
    const jeo = this.props.job_eval_objectives[jeo_id]
    this.props.setLocalStateVar({
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
      something_changed: false,
      message: '',
    }, when_done)
  }

  buildJeoLoadButton() {
    const jeo_keys = Object.keys(this.props.job_eval_objectives)
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
            const jeo = this.props.job_eval_objectives[jeo_key]
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

  handleDroppedArchive(event) {
    event.preventDefault()
    event.stopPropagation()
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      for (let i=0; i < event.dataTransfer.files.length; i++) {
        this.handleUploadedArchive(event.dataTransfer.files[i])
      }
    }
  }

  async handleUploadedArchive(the_file) {
    let reader = new FileReader()
    let app_this = this
    reader.onload = function(e) {
      app_this.props.postImportArchiveCall({
        data_uri: e.target.result,
        filename: the_file.name,
        when_done: ((x)=>{app_this.props.setMessage('archive upload initiated')}),
        when_failed: (err) => {app_this.props.setMessage('archive upload failed')},
      })
    }
    reader.readAsDataURL(the_file)
  }

  buildJobRunSummaryImportTarget() {
    return (
      <div        
        className='h3 font-italic border-1'
        draggable='true'
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => this.handleDroppedArchive(event)}
      >
        drop archived job run summaries here to upload
      </div>
    )
  }

  render() {
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
    const import_target = this.buildJobRunSummaryImportTarget()
    let show_hide_details = ''
    if (this.props.jeo_id) {
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
                {this.props.jeo_id}
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
                      value={this.props.jeo_description}
                      onChange={(event) => this.props.setLocalStateVarAndWarn('jeo_description', event.target.value)}
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

                <div className='row m-1'>
                  {import_target}
                </div>

              </div>
            </div>

          </div>
        </div>


      </div>
    )
  }
}

export default JobEvalJeoLogic;
