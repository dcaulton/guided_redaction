import React from 'react';

class FrameCard extends React.Component {
  render() {
    return (
      <div className='col-md-2 frameCard m-3 p-3 bg-light'>
        <h5 className='card-title'>{this.props.image_name}</h5>
        <img 
            className='zoomable-image'
            src={this.props.image_url} 
            alt='whatever'
        />
        <div className='card-body'>

          <p className='card-text'>
            {this.props.hasRedactionInfo ? 'has redaction info' : ''}
          </p>
        </div>
      </div>
    )
  }
}

//          onDrop={() => this.props.handleDroppedFrameset(this.props.frame_hash)}
class FramesetCard extends React.Component {
  render() {
    return (
      <div 
          id={this.props.frame_hash}
          className='col-md-2 frameCard m-3 p-3 bg-light' 
          draggable='true'
          onDragStart={() => this.props.setDraggedId(this.props.frame_hash)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => this.props.handleDroppedFrameset(this.props.frame_hash)}
      >
        <div className='frameset_hash'>{this.props.frame_hash}</div>
        <img 
            className='zoomable-image'
            src={this.props.image_url} 
            alt='whatever'
            onClick={() => this.props.setZoomImageUrl(this.props.image_url)}
        />
        <div className='card-body'>
          <div className='card-text'>{this.props.image_names.length} images</div>
        </div>
        <div>
          <p>{this.props.redactionDesc}</p>
        </div>
        <div>
          <button
            className='btn btn-primary'
            onClick={() => this.props.redactFramesetCallback(this.props.frame_hash)}
          >
            Redact
          </button>
        </div>
      </div>
    )
  }
}

class FramesetCardList extends React.Component {
  getImageNamesList(image_list) {
    let name_elements = Object.keys(image_list).map((img_name) =>
      <p
        key={Math.random() * 10**9}
      >
        {this.props.getNameFor(image_list[img_name])}
      </p>
    );
    return name_elements
  }

  getRedactionDesc(hash_key) {
      const areas_to_redact = this.props.getRedactionFromFrameset(hash_key)
      if (areas_to_redact.length > 0) {
          return 'has redaction data'
      }  else  {
          return ''
      }
  }

  render() {
    let ordered_frame_hashes = Object.keys(this.props.framesets)
    let items = ordered_frame_hashes.map((key) =>
      <FramesetCard
        setDraggedId={this.props.setDraggedId}
        handleDroppedFrameset={this.props.handleDroppedFrameset}
        frame_hash={key}
        image_names={this.getImageNamesList(this.props.framesets[key]['images'])}
        image_url={this.props.framesets[key]['images'][0]}
        key={key}
        redactFramesetCallback={this.props.redactFramesetCallback}
        redactionDesc={this.getRedactionDesc(key)}
        setZoomImageUrl={this.props.setZoomImageUrl}
      />
    );
    return items
  }
}

class FrameCardList extends React.Component {
  render() {
    let items = this.props.frames.map((item) =>
      <FrameCard
        image_url={item}
        image_name={this.props.getNameFor(item)}
        key={item}
        hasRedactionInfo={this.props.imageUrlHasRedactionInfo(item)}
      />
    );
    return items
  }
}

export {FramesetCardList, FrameCardList};
