import React from 'react';

class OcrControls extends React.Component {

  render() {
    if (!this.props.showOcr) {
      return([])
    }

    return (
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
                  +/-
                </button>
              </div>
              <div>
                <div>
                  <input
                    className='mr-2 mt-3'
                    type='checkbox'
                    onChange={() => this.props.toggleShowOcr()}
                  />
                </div>
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
    )
  }
}

export default OcrControls;
