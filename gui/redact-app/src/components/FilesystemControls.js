import React from 'react';

class FilesystemControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      showBriefListing: true,
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
        <div className='col-lg-4'>
          files
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
          const parts = value.split('/')
          const file_uuid = parts[parts.length-1]
          let files_list = this.props.files['files'][value]['files']
          let files_count= this.props.files['files'][value]['files'].length
          let files_count_message = files_count.toString() + ' files'

          return (
            <div key={index} className='row border-top mt-2'>
              <div className='col-lg-4'>
                {file_uuid}
              </div>
              <div className='col-lg-4'>
                {files_count_message}
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

  render() {
    if (!this.props.showFilesystem) {
      return([])
    }
    const files_list = this.buildFilesList()
    let show_brief_checked = ''
    if (this.state.showBriefListing) {
      show_brief_checked = 'checked'
    }

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>
            <div className='row'>
              <div 
                className='col-lg-10 h3'
              > 
                file system
              </div>
              <div className='col-lg-1 float-right'>
                <button
                    className='btn btn-link'
                    aria-expanded='false'
                    data-target='#filesystem_body'
                    aria-controls='filesystem_body'
                    data-toggle='collapse'
                    type='button'
                >
                  +/-
                </button>
              </div>
              <div className='col-lg-1'>
                <div>
                  <input
                    className='mr-2 mt-3'
                    type='checkbox'
                    onChange={() => this.props.toggleShowFilesystem()}
                  />
                </div>
              </div>
            </div>

            <div 
                id='filesystem_body' 
                className='row collapse'
            >
              <div id='filesystem_main' className='col'>
                <div className='row ml-2 mt-3'>
                  <div
                      className='d-inline'
                  >
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
