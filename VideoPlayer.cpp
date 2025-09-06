#include "VideoPlayer.h"
#include <QFileInfo>
#include <QDebug>
#include <algorithm>
#include <QKeyEvent>

VideoPlayer::VideoPlayer(const QString &file, QWidget *parent)
    : QWidget(parent), filePath(file)
{
    setWindowTitle(QFileInfo(filePath).fileName());
    resize(800, 450);

    // Video widget
    videoWidget = new QVideoWidget(this);
    videoWidget->setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Expanding);

    // Media player
    mediaPlayer = new QMediaPlayer(this);
    audioOutput = new QAudioOutput(this);
    mediaPlayer->setAudioOutput(audioOutput);
    audioOutput->setVolume(1.0);
    mediaPlayer->setVideoOutput(videoWidget);
    mediaPlayer->setSource(QUrl::fromLocalFile(filePath));
    mediaPlayer->play();

    // Controls
    playBtn = new QPushButton("Pause");
    skipBackBtn = new QPushButton("<<10s");
    skipForwardBtn = new QPushButton("10s>>");
    muteBtn = new QPushButton("Mute");
    fullscreenBtn = new QPushButton("Fullscreen");

    positionSlider = new QSlider(Qt::Horizontal);
    positionSlider->setRange(0, 100);

    volumeSlider = new QSlider(Qt::Horizontal);
    volumeSlider->setRange(0, 100);
    volumeSlider->setValue(100);

    speedBox = new QComboBox();
    speedBox->addItems({"0.5x","1x","1.5x","2x"});

    timeLabel = new QLabel("00:00 / 00:00");

    // Layouts
    controlsLayout = new QHBoxLayout;
    controlsLayout->addWidget(playBtn);
    controlsLayout->addWidget(skipBackBtn);
    controlsLayout->addWidget(skipForwardBtn);
    controlsLayout->addWidget(muteBtn);
    controlsLayout->addWidget(speedBox);
    controlsLayout->addWidget(fullscreenBtn);
    controlsLayout->addWidget(positionSlider, 1); // expand slider
    controlsLayout->addWidget(volumeSlider);
    controlsLayout->addWidget(timeLabel);

    mainLayout = new QVBoxLayout(this);
    mainLayout->addWidget(videoWidget, 1); // video expands
    mainLayout->addLayout(controlsLayout);
    mainLayout->setContentsMargins(0,0,0,0);
    mainLayout->setSpacing(5);
    setLayout(mainLayout);

    // Timer for updating slider & time label
    updateTimer = new QTimer(this);
    updateTimer->setInterval(200);
    connect(updateTimer, &QTimer::timeout, this, &VideoPlayer::updatePosition);
    updateTimer->start();

    // Connect buttons
    connect(playBtn, &QPushButton::clicked, this, &VideoPlayer::togglePlayPause);
    connect(skipBackBtn, &QPushButton::clicked, this, &VideoPlayer::skipBackward);
    connect(skipForwardBtn, &QPushButton::clicked, this, &VideoPlayer::skipForward);
    connect(muteBtn, &QPushButton::clicked, this, &VideoPlayer::toggleMute);
    connect(fullscreenBtn, &QPushButton::clicked, this, &VideoPlayer::toggleFullscreen);
    connect(positionSlider, &QSlider::sliderMoved, this, &VideoPlayer::setPosition);
    connect(volumeSlider, &QSlider::valueChanged, this, &VideoPlayer::setVolume);
    connect(speedBox, &QComboBox::currentTextChanged, this, &VideoPlayer::setSpeed);
}

VideoPlayer::~VideoPlayer() {
    mediaPlayer->stop();
}

void VideoPlayer::togglePlayPause() {
    if(mediaPlayer->playbackState() == QMediaPlayer::PlayingState){
        mediaPlayer->pause();
        playBtn->setText("Play");
    } else {
        mediaPlayer->play();
        playBtn->setText("Pause");
    }
}

void VideoPlayer::skipBackward() {
    qint64 pos = mediaPlayer->position();
    mediaPlayer->setPosition(std::max(pos - 10000, qint64(0)));
}

void VideoPlayer::skipForward() {
    qint64 pos = mediaPlayer->position();
    qint64 dur = mediaPlayer->duration();
    mediaPlayer->setPosition(std::min(pos + 10000, dur));
}

void VideoPlayer::toggleMute() {
    audioOutput->setMuted(!audioOutput->isMuted());
}

void VideoPlayer::toggleFullscreen() {
    if (isFullScreen()) {
        showNormal();
        fullscreenBtn->setText("Fullscreen");
    } else {
        showFullScreen();
        fullscreenBtn->setText("Exit Fullscreen");
    }
}

void VideoPlayer::updatePosition() {
    if(!mediaPlayer) return;
    qint64 duration = mediaPlayer->duration();
    if(duration <= 0) return;
    qint64 pos = mediaPlayer->position();
    positionSlider->setValue(static_cast<int>((pos*100)/duration));

    qint64 secondsPos = pos / 1000;
    qint64 secondsDur = duration / 1000;
    QString t = QString("%1:%2 / %3:%4")
        .arg(secondsPos/60,2,10,QChar('0')).arg(secondsPos%60,2,10,QChar('0'))
        .arg(secondsDur/60,2,10,QChar('0')).arg(secondsDur%60,2,10,QChar('0'));
    timeLabel->setText(t);
}

void VideoPlayer::setPosition(int value) {
    if(!mediaPlayer) return;
    qint64 duration = mediaPlayer->duration();
    mediaPlayer->setPosition((value * duration) / 100);
}

void VideoPlayer::setVolume(int value) {
    audioOutput->setVolume(value / 100.0);
}

void VideoPlayer::setSpeed(const QString &speedText) {
    qreal rate = speedText.left(speedText.length()-1).toDouble();
    mediaPlayer->setPlaybackRate(rate);
}
