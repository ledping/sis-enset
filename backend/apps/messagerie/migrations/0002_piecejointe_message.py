# Generated for SIS ENSET v8.3 messagerie enrichie
from django.db import migrations, models
import django.db.models.deletion
import apps.messagerie.models


class Migration(migrations.Migration):

    dependencies = [
        ('messagerie', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='messageinterne',
            name='contenu',
            field=models.TextField(blank=True),
        ),
        migrations.CreateModel(
            name='PieceJointeMessage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fichier', models.FileField(upload_to=apps.messagerie.models.message_attachment_upload_path)),
                ('nom_original', models.CharField(max_length=255)),
                ('type_fichier', models.CharField(blank=True, max_length=120)),
                ('taille', models.PositiveIntegerField(default=0)),
                ('est_vocal', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('message', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='pieces_jointes', to='messagerie.messageinterne')),
            ],
            options={
                'verbose_name': 'Piece jointe de message',
                'verbose_name_plural': 'Pieces jointes de messages',
                'ordering': ['created_at'],
            },
        ),
    ]
