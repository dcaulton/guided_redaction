import React from 'react';
import {
  makeHeaderRow,
  } from './SharedControls'

class ImportExportControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      job_ids: [],
      pipeline_ids: [],
      movie_urls: [],
      archive_url: '',
      include_child_jobs: true,
      include_child_movie_frames: true,
    }
    this.setLocalStateVar=this.setLocalStateVar.bind(this)
    this.exportDone=this.exportDone.bind(this)
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

  toggleLocalChecked(item_type, the_id) {
    let deepCopyIds = JSON.parse(JSON.stringify(this.state[item_type]))
    if (deepCopyIds.includes(the_id)) {
      const the_index = deepCopyIds.indexOf(the_id)
      deepCopyIds.splice(the_index, 1)
    } else {
      deepCopyIds.push(the_id)
    }
    this.setLocalStateVar(item_type, deepCopyIds)
  }


  buildJobsPicker() {
    let include_child_jobs_checked = ''
    if (this.state.include_child_jobs) {
      include_child_jobs_checked = 'checked'
    }
    let include_child_movie_frames_checked = ''
    if (this.state.include_child_movie_frames) {
      include_child_movie_frames_checked = 'checked'
    }
    return (
      <div className='col mb-3'>
        <div className='row h5 border-top'>
          <div className='col'>
            Jobs
          </div>
        </div>
        <div className='row'>
          <div className='d-inline'>
            <input
              className='ml-2 mr-2 mt-1'
              checked={include_child_movie_frames_checked}
              type='checkbox'
              onChange={
                () => this.setLocalStateVar(
                  'include_child_movie_frames', 
                  !this.state.include_child_movie_frames
                )
              }
            />
          </div>
          <div className='d-inline'>
            include all child movie frames
          </div>
        </div>
        <div className='row border-bottom'>
          <div className='d-inline'>
            <input
              className='ml-2 mr-2 mt-1'
              checked={include_child_jobs_checked}
              type='checkbox'
              onChange={() => this.setLocalStateVar('include_child_jobs', !this.state.include_child_jobs)}
            />
          </div>
          <div className='d-inline'>
            include all child jobs
          </div>
        </div>
        {this.props.jobs.map((job, index) => {
          const disp_name = job.id + ' - ' + job.operation
          let job_checked = ''
          if (this.state.job_ids.includes(job.id)) {
            job_checked = 'checked'
          }
          return (
            <div className='row' key={index}>

              <div className='d-inline'>
                <input
                  className='ml-2 mr-2 mt-1'
                  id={job.id}
                  checked={job_checked}
                  type='checkbox'
                  onChange={() => this.toggleLocalChecked('job_ids', job.id)}
                />
              </div>

              <div className='d-inline'>
              {disp_name}
              </div>

            </div>
          )
        })}
      </div>
    )
  }

  buildPipelinesPicker() {
    return (
      <div className='col mb-3'>
        <div className='row h5'>
          Pipelines
        </div>
        {Object.keys(this.props.pipelines).map((pipeline_id, index) => {
          const pipeline = this.props.pipelines[pipeline_id]
          const disp_name = pipeline.id + ' - ' + pipeline.name
          let pipeline_checked = ''
          if (this.state.pipeline_ids.includes(pipeline_id)) {
            pipeline_checked = 'checked'
          }
          const the_style = {fontSize: '.8em'}
          return (
            <div 
              style={the_style}
              className='row' 
              key={index}
            >

              <div className='d-inline '>
                <input
                  className='ml-2 mr-2 mt-1'
                  id={pipeline_id}
                  checked={pipeline_checked}
                  type='checkbox'
                  onChange={() => this.toggleLocalChecked('pipeline_ids', pipeline.id)}
                />
              </div>

              <div className='d-inline'>
              {disp_name}
              </div>

            </div>
          )
        })}
      </div>
    )
  }

  buildMoviesPicker() {
    return (
      <div className='col mb-3'>
        <div className='row h5'>
          Movies
        </div>
        {Object.keys(this.props.movies).map((movie_url, index) => {
          const disp_name = movie_url.split('/').slice(-1)[0]
          let movie_checked = ''
          if (this.state.movie_urls.includes(movie_url)) {
            movie_checked = 'checked'
          }
          return (
            <div className='row' key={index}>

              <div className='d-inline'>
                <input
                  className='ml-2 mr-2 mt-1'
                  id={movie_url}
                  checked={movie_checked}
                  type='checkbox'
                  onChange={() => this.toggleLocalChecked('movie_urls', movie_url)}
                />
              </div>

              <div className='d-inline'>
              {disp_name}
              </div>

            </div>
          )
        })}
      </div>
    )
  }

  buildExportButton() {
    return (
      <button
          key='000'
          className='btn btn-primary'
          onClick={() => this.startExport() }
      >
        Export
      </button>
    )
  }


  startExport() {
    let build_movies = {}
    for (let i=0; i < this.state.movie_urls.length; i++) {
      const movie_url = this.state.movie_urls[i]
      build_movies[movie_url] = this.props.movies[movie_url]
    }
    const build_obj = {
      job_ids: this.state.job_ids,
      pipeline_ids: this.state.pipeline_ids,
      movies: build_movies,
      include_child_jobs: this.state.include_child_jobs,
      include_child_movie_frames: this.state.include_child_movie_frames,
    }
    this.props.runExportTask(
      build_obj,
      this.exportDone
    )
  }
  
  exportDone(responseJson) {
    this.setLocalStateVar('archive_url', responseJson['archive_url'])
  }

  buildDownloadArchiveLink() {
    if (!this.state.archive_url) {
      return
    }
    const div_style = {
      backgroundColor: '#CFD'
    }
    return (
      <div 
        style={div_style}
        className='h5 rounded m-2 p-2'
      >
        <div className='d-inline'>
          your archive is ready, 
        </div>
        <div className='d-inline ml-2'>
          <a
            href={this.state.archive_url}
          >
            Download
          </a>
        </div>
      </div>
    )
  }


  handleDroppedMovie(event) {
    event.preventDefault()
    event.stopPropagation()
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      for (let i=0; i < event.dataTransfer.files.length; i++) {
        this.handleDownloadedArchive(event.dataTransfer.files[i])
      }
    }
  }

  async handleDownloadedArchive(the_file) {
    let reader = new FileReader()
    let app_this = this
    reader.onload = function(e) {
      app_this.props.postImportArchiveCall({
        data_uri: e.target.result,
        filename: the_file.name,
        when_done: ((x)=>{app_this.props.setGlobalStateVar('archive upload initiated')}),
        when_failed: (err) => {app_this.props.setGlobalStateVar('archive upload failed')},
      })
    }
    reader.readAsDataURL(the_file)
  }

  buildUploadArchiveLink() {
    return (
      <div
        className='border m-5 p-5 '
        draggable='true'
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => this.handleDroppedMovie(event)}
      >
        Drop Archive File here to Upload
      </div>
    )
  }

  render() {
    if (!this.props.visibilityFlags['import_export']) {
      return([])
    }

    const header_row = makeHeaderRow(
      'import/export',
      'import_export_body',
      (() => this.props.toggleShowVisibility('import_export'))
    )
    const jobs_picker = this.buildJobsPicker()
    const pipelines_picker = this.buildPipelinesPicker()
    const movies_picker = this.buildMoviesPicker()
    const export_button = this.buildExportButton()
    const download_archive_link = this.buildDownloadArchiveLink()
    const upload_archive_link = this.buildUploadArchiveLink()
    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>

            {header_row}

            <div 
                id='import_export_body' 
                className='row collapse'
            >
              <div id='zip_main' className='col'>

                <div id='row mt-2'>
                  {jobs_picker}
                </div>

                <div id='row mt-2'>
                  {pipelines_picker}
                </div>

                <div id='row mt-2'>
                  {movies_picker}
                </div>

                <div id='row mt-2'>
                  {export_button}
                </div>

                <div id='row mt-2'>
                  {download_archive_link}
                </div>

                <div id='row mt-2'>
                  {upload_archive_link}
                </div>

              </div>
            </div>

          </div>
        </div>
    )
  }
}

export default ImportExportControls;
