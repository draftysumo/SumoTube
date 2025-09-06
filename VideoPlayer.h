#pragma once
#include <QWidget>
#include <QPushButton>
#include <QSlider>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QLabel>
#include <QComboBox>
#include <QTimer>
#include <QMediaPlayer>
#include <QVideoWidget>
#include <QAudioOutput>
#include <QString>

class VideoPlayer : public QWidget {
    Q_OBJECT
public:
    explicit VideoPlayer(const QString &filePath, QWidget *parent = nullptr);
    ~VideoPlayer();

private:
    QString filePath;

    QMediaPlayer *mediaPlayer;
    QAudioOutput *audioOutput;
    QVideoWidget *videoWidget;

    // Controls
    QPushButton *playBtn;
    QPushButton *skipBackBtn;
    QPushButton *skipForwardBtn;
    QPushButton *muteBtn;
    QPushButton *fullscreenBtn;
    QSlider *positionSlider;
    QSlider *volumeSlider;
    QComboBox *speedBox;
    QLabel *timeLabel;

    QVBoxLayout *mainLayout;
    QHBoxLayout *controlsLayout;
    QTimer *updateTimer;

private slots:
    void togglePlayPause();
    void skipBackward();
    void skipForward();
    void toggleMute();
    void toggleFullscreen();
    void updatePosition();
    void setPosition(int value);
    void setVolume(int value);
    void setSpeed(const QString &speedText);
};
