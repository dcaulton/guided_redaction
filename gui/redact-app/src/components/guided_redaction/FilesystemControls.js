import React from 'react';
import {
  makeHeaderRow,
} from './SharedControls'

class FilesystemControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      showBriefListing: true,
      secure_file_recording_id: '',
    }
  }

  toggleShowBriefListing() {
    const new_value = (!this.state.showBriefListing)
    this.setState({
      showBriefListing: new_value,
    })
  }

  buildFilesListHeaders() {
    return (
      <div key='99999' className='row font-weight-bold'>
        <div className='col-lg-4'>
          directory name
        </div>
        <div className='col-lg-3'>
          files
        </div>
        <div className='col-lg-1'>
          load
        </div>
        <div className='col-lg-2'>
          space used
        </div>
        <div className='col-lg-2'>
        </div>
      </div>
    )
  }

  buildSpaceUsedLine() {
    return (
      <div className='mb-2'>total space used: {this.props.files['overall_space_used']}</div>
    )
  }

  buildLoadMovieLink(dir_name) {
    let uuid_part = ''
    let file_part = ''
    const metadata_regex = /file:\s*(.*movie_metadata.json)\s*size:/
    for (let i=0; i < this.props.files['files'][dir_name]['files'].length; i++) {
      const filename = this.props.files['files'][dir_name]['files'][i]
      if (filename.match(metadata_regex)) {
        const mo = filename.match(metadata_regex)
        const parts = dir_name.split('/')
        uuid_part = parts[parts.length-1]
        file_part = mo[1]
      }
    }
    if (uuid_part) {
      return (
        <button
            className='btn btn-link p-1'
            onClick={() => this.props.submitInsightsJob(
              'load_movie_metadata', 
              {uuid_part: uuid_part, file_part: file_part}
            )}
        >
          load
        </button>
      )
    } else {
      return ''
    }
  }

  buildFilesListBrief() {
    const file_keys = Object.keys(this.props.files['files'])
    const the_style = {
      'fontSize': '12px',
    }

    const headers = this.buildFilesListHeaders()
    const total_used = this.buildSpaceUsedLine()
    return (
      <div style={the_style}>
        {total_used}
        {headers}
        {file_keys.map((value, index) => {
          const load_link = this.buildLoadMovieLink(value) 
          const parts = value.split('/')
          const file_uuid = parts[parts.length-1]
          let files_count= this.props.files['files'][value]['files'].length
          let files_count_message = files_count.toString() + ' files'

          return (
            <div key={index} className='row border-top mt-2'>
              <div className='col-lg-4'>
                {file_uuid}
              </div>
              <div className='col-lg-3'>
                {files_count_message}
              </div>
              <div className='col-lg-3'>
                {load_link}
              </div>
              <div className='col-lg-2'>
                {this.props.files['files'][value]['total_space_used']}
              </div>
              <div className='col-lg-2'>
                <button
                    className='btn btn-primary ml-2 mt-2'
                    onClick={() => this.props.deleteFile(
                      file_uuid,
                      (() => {this.props.displayInsightsMessage('file was deleted')})
                    )}
                >
                  Delete
                </button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  buildFilesList() {
    if (Object.keys(this.props.files).length === 0) {
      return ''
    }

    if (this.state.showBriefListing) {
      return this.buildFilesListBrief()
    }

    const file_keys = Object.keys(this.props.files['files'])
    const the_style = {
      'fontSize': '12px',
    }
    const headers = this.buildFilesListHeaders()
    const total_used = this.buildSpaceUsedLine()

    return (
      <div style={the_style}>
        {total_used}
        {headers}
        {file_keys.map((value, index) => {
          const parts = value.split('/')
          const file_uuid = parts[parts.length-1]
          let files_list = this.props.files['files'][value]['files']

          return (
            <div key={index} className='row border-top mt-2'>
              <div className='col-lg-4'>
                {file_uuid}
              </div>
              <div className='col-lg-4'>
                {files_list.map((value2, index2) => {
                  return (
                    <div key={index2}>
                      {value2}
                    </div>
                  )
                })}
              </div>
              <div className='col-lg-2'>
                {this.props.files['files'][value]['total_space_used']}
              </div>
              <div className='col-lg-2'>
                <button
                    className='btn btn-primary ml-2 mt-2'
                    onClick={() => this.props.deleteFile(
                      file_uuid,
                      (() => {this.props.displayInsightsMessage('file was deleted')})
                    )}
                >
                  Delete
                </button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  setSecureFileRecordingId(value) {
    this.setState({
      secure_file_recording_id: value,
    })
  }

  buildImportSecureFileButton() {
    return (
      <div>
        <div className='font-weight-bold'>
          Import From Secure Files
        </div>
        <div className='d-inline ml-2'>
          Recording Id:
        </div>
        <div className='d-inline ml-3'>
          <input
              id='import_secure_file_recording_id'
              size='50'
              onChange={(event) => this.setSecureFileRecordingId(event.target.value)}
              title='recording id'
          />
        </div>
        <div className='d-inline ml-3'>
          <button
            className='btn btn-primary p-1'
            onClick={() => this.props.submitInsightsJob('get_secure_file', this.state.secure_file_recording_id)}
          >
            Go
          </button>
        </div>
      </div>
    )
  }

  buildMovieMetadataLink() {
    return (
      <div>
        <button
            className='btn btn-link'
            type='button'
            onClick={() => this.props.submitInsightsJob('save_movie_metadata', this.props.buildMovieMetadata())}
        >
          save active movie metadata
        </button>
      </div>
    )
  }

  render() {
    if (!this.props.visibilityFlags['filesystem']) {
      return([])
    }
    const files_list = this.buildFilesList()
    let show_brief_checked = ''
    if (this.state.showBriefListing) {
      show_brief_checked = 'checked'
    }
    const secure_file_button = this.buildImportSecureFileButton()
    const build_movie_metadata_link = this.buildMovieMetadataLink()
    const header_row = makeHeaderRow(
      'file system',
      'filesystem_body',
      (() => this.props.toggleShowVisibility('filesystem'))
    )

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>

            {header_row}

            <div 
                id='filesystem_body' 
                className='row collapse'
            >
              <div id='filesystem_main' className='col'>
                <div className='row ml-2 mt-3'>
                  {build_movie_metadata_link}
                </div>
                <div className='row ml-2 mt-3'>
                  {secure_file_button}
                </div>
                <div className='row ml-2 mt-3 border-top'>
                  <div
                      className='d-inline'
                  >
                    <div className='font-weight-bold'>
                      Browse Filesystem
                    </div>
                    <button
                        className='btn btn-primary ml-2 mt-2'
                        onClick={() => this.props.getFiles() }
                    >
                      Refresh Files
                    </button>
                  </div>
                </div>

                <div className='row mt-3 bg-light rounded'>
                  <input
                    className='ml-2 mr-2 mt-1'
                    id='toggle_show_brief'
                    checked={show_brief_checked}
                    type='checkbox'
                    onChange={() => this.toggleShowBriefListing()}
                  />
                  Show Brief Listing
                </div> 

                <div className='row ml-2 mt-3'>
                  <div className='col'>
                  {files_list}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
    )
  }
}

export default FilesystemControls;
